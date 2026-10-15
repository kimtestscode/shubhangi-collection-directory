import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { isAdminRequest } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const layout = (formData.get('layout') as string) || '4_on_1'; // '4_on_1' or '2_on_1'

    if (!file) {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const srcDoc = await PDFDocument.load(fileBuffer);
    const outDoc = await PDFDocument.create();

    const A4_W = 595.28;
    const A4_H = 841.89;

    // Detect label pages:
    // In Shiprocket combined label+invoice, shipping labels are on even pages (0, 2, 4...)
    // If it's a label-only file (every page is landscape 841x595 or 420x595), detect all pages
    const labelIndices: number[] = [];
    const pageCount = srcDoc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const p = srcDoc.getPage(i);
      const { width, height } = p.getSize();
      // Shiprocket combined label page is landscape A4 (approx 841.89 x 595.28)
      // Invoice page is portrait A4 (approx 595.28 x 841.89)
      if (width > height) {
        labelIndices.push(i);
      } else if (pageCount === 1) {
        // If single page
        labelIndices.push(i);
      } else if (i % 2 === 0 && pageCount > 1) {
        // Fallback for standard combined files
        labelIndices.push(i);
      }
    }

    if (labelIndices.length === 0) {
      return NextResponse.json(
        { error: 'No shipping labels found in the uploaded PDF.' },
        { status: 400 }
      );
    }

    // Label crop coordinates inside Shiprocket landscape A4 (841.89 x 595.28 pt):
    // In PDF bottom-left coordinates:
    // Left: 14.17 pt, Bottom: 297.64 pt, Right: 420.94 pt, Top: 581.11 pt
    // Label native dimensions: 406.77 pt width x 283.47 pt height
    const CROP_BOX = {
      left: 14.17,
      bottom: 297.64,
      right: 420.94,
      top: 581.11,
    };
    const NATIVE_W = 406.77;
    const NATIVE_H = 283.47;
    const ASPECT = NATIVE_W / NATIVE_H; // ~1.435

    if (layout === '2_on_1') {
      // 2 large labels per A4 portrait page
      const marginX = (A4_W - NATIVE_W) / 2; // ~94 pt
      const marginY = 50;
      const gapY = 50;

      let curPage: any = null;
      let slot = 0;

      for (let i = 0; i < labelIndices.length; i++) {
        if (slot % 2 === 0) {
          curPage = outDoc.addPage([A4_W, A4_H]);
          slot = 0;
        }

        const y = slot === 0 ? A4_H - marginY - NATIVE_H : marginY;

        const embedded = await outDoc.embedPage(srcDoc.getPage(labelIndices[i]), CROP_BOX);
        curPage.drawPage(embedded, {
          x: marginX,
          y,
          width: NATIVE_W,
          height: NATIVE_H,
        });

        slot++;
      }
    } else {
      // 4 labels per A4 portrait page (2x2 grid)
      const marginX = 20;
      const marginY = 35;
      const gapX = 15;
      const gapY = 30;

      const targetW = (A4_W - 2 * marginX - gapX) / 2; // ~270 pt
      const targetH = targetW / ASPECT; // ~188 pt

      let curPage: any = null;
      let slot = 0;

      for (let i = 0; i < labelIndices.length; i++) {
        if (slot % 4 === 0) {
          curPage = outDoc.addPage([A4_W, A4_H]);
          slot = 0;
        }

        const col = slot % 2;
        const row = Math.floor(slot / 2); // 0 = top, 1 = bottom

        const x = marginX + col * (targetW + gapX);
        const y = A4_H - marginY - (row + 1) * targetH - row * gapY;

        const embedded = await outDoc.embedPage(srcDoc.getPage(labelIndices[i]), CROP_BOX);
        curPage.drawPage(embedded, {
          x,
          y,
          width: targetW,
          height: targetH,
        });

        slot++;
      }
    }

    const outputBytes = await outDoc.save();
    return new NextResponse(outputBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Shiprocket_Labels_Cropped_A4.pdf"',
      },
    });
  } catch (err: any) {
    console.error('Failed to crop Shiprocket labels:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process and crop PDF' },
      { status: 500 }
    );
  }
}
