import { PDFDocument } from 'pdf-lib';

export async function cropShiprocketPdfToA4(
  fileBuffer: Uint8Array | Buffer,
  layout: '4_on_1' | '2_on_1' = '4_on_1'
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(fileBuffer);
  const outDoc = await PDFDocument.create();

  const A4_W = 595.28;
  const A4_H = 841.89;

  // Detect label pages:
  // In Shiprocket combined label+invoice, shipping labels are on even pages (0, 2, 4...)
  // Or landscape pages where width > height
  const labelIndices: number[] = [];
  const pageCount = srcDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const p = srcDoc.getPage(i);
    const { width, height } = p.getSize();
    if (width > height) {
      labelIndices.push(i);
    } else if (pageCount === 1) {
      labelIndices.push(i);
    } else if (i % 2 === 0 && pageCount > 1) {
      labelIndices.push(i);
    }
  }

  if (labelIndices.length === 0) {
    throw new Error('No shipping labels found in the PDF.');
  }

  // Label crop coordinates inside Shiprocket landscape A4 (841.89 x 595.28 pt):
  // Left: 14.17 pt, Bottom: 297.64 pt, Right: 420.94 pt, Top: 581.11 pt
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
    const marginX = (A4_W - NATIVE_W) / 2;
    const marginY = 50;

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

  return await outDoc.save();
}
