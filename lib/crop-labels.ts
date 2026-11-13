import { PDFDocument } from 'pdf-lib';
import zlib from 'zlib';

export interface CropBox {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

/**
 * Detects whether a page has a second label on the right side (Shiprocket A4 landscape dual-label format).
 */
function getLandscapeLabelBoxes(page: any): CropBox[] {
  const leftBox: CropBox = { left: 14.17, bottom: 297.64, right: 420.94, top: 581.11 };
  const rightBox: CropBox = { left: 420.94, bottom: 297.64, right: 827.71, top: 581.11 };

  try {
    const stream = page.node.Contents();
    if (!stream) return [leftBox];
    const bytes = stream.asUint8Array();
    let text = '';
    try {
      text = zlib.inflateSync(Buffer.from(bytes)).toString('utf8');
    } catch {
      text = Buffer.from(bytes).toString('utf8');
    }

    // Check if right side has label content (coordinates > 420)
    const hasRightLabel =
      text.includes('422.36') ||
      text.includes('425.2') ||
      text.includes('430.87') ||
      text.includes('626.46');

    return hasRightLabel ? [leftBox, rightBox] : [leftBox];
  } catch {
    return [leftBox];
  }
}

/**
 * Extracts the usable content bottom of a Shiprocket manifest page
 * to strip out the large empty white space below the signatures and footer.
 */
function getManifestContentBottom(buf: Uint8Array | Buffer): number {
  let pos = 0;
  let bottom = 380;
  const s = Buffer.from(buf);

  while (true) {
    const streamStart = s.indexOf('stream', pos);
    if (streamStart === -1) break;
    const streamEnd = s.indexOf('endstream', streamStart);
    if (streamEnd === -1) break;
    let start = streamStart + 6;
    if (s[start] === 13) start++;
    if (s[start] === 10) start++;
    const chunk = s.slice(start, streamEnd);
    try {
      const txt = zlib.inflateSync(chunk).toString('utf8');
      if (txt.includes('MANIFEST')) {
        const lines = txt.split('\n');
        for (const l of lines) {
          if (l.includes('This is a system generated document')) {
            const m = l.match(/([0-9.-]+)\s+([0-9.-]+)\s+Td/);
            if (m) {
              return Math.max(300, parseFloat(m[2]) - 16);
            }
          }
        }
      }
    } catch {
      // ignore
    }
    pos = streamEnd + 9;
  }
  return bottom;
}

/**
 * Tiles Shiprocket pickup manifests efficiently on A4 pages.
 * Trims excessive blank bottom space, packing 2 to 3 manifests per A4 page without waste.
 */
export async function tileManifestPdfs(buffers: (Uint8Array | Buffer)[]): Promise<Uint8Array> {
  const outDoc = await PDFDocument.create();

  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN_TOP = 15;
  const MARGIN_BOTTOM = 15;
  const GAP = 12;

  let curPage: any = null;
  let currentY = 0;

  for (const buf of buffers) {
    const srcDoc = await PDFDocument.load(buf);
    const count = srcDoc.getPageCount();

    for (let p = 0; p < count; p++) {
      const srcPage = srcDoc.getPage(p);
      const bottom = getManifestContentBottom(buf);
      const top = 810;
      const cropH = top - bottom;
      const cropW = A4_W;

      const targetW = A4_W - 20; // 10pt margin on left and right
      const scale = targetW / cropW;
      const drawW = targetW;
      const drawH = cropH * scale;

      // Check if it fits on curPage
      if (!curPage || currentY - drawH < MARGIN_BOTTOM) {
        curPage = outDoc.addPage([A4_W, A4_H]);
        currentY = A4_H - MARGIN_TOP;
      }

      const embedded = await outDoc.embedPage(srcPage, {
        left: 0,
        bottom,
        right: cropW,
        top,
      });

      const drawY = currentY - drawH;
      curPage.drawPage(embedded, {
        x: 10,
        y: drawY,
        width: drawW,
        height: drawH,
      });

      currentY = drawY - GAP;
    }
  }

  return await outDoc.save();
}

/**
 * Crops and tiles Shiprocket shipping labels to A4 paper.
 * Supports:
 * - '8_on_1': 8 labels per A4 page (2 columns × 4 rows)
 * - '4_on_1': 4 labels per A4 page (2 columns × 2 rows)
 * - '2_on_1': 2 labels per A4 page (stacked vertically)
 */
export async function cropShiprocketPdfToA4(
  fileBuffer: Uint8Array | Buffer,
  layout: '4_on_1' | '2_on_1' | '8_on_1' = '8_on_1'
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(fileBuffer);
  const outDoc = await PDFDocument.create();

  const A4_W = 595.28;
  const A4_H = 841.89;
  const pageCount = srcDoc.getPageCount();

  // Collect all individual label cuts
  const labels: Array<{ page: any; box: CropBox }> = [];

  for (let i = 0; i < pageCount; i++) {
    const page = srcDoc.getPage(i);
    const { width, height } = page.getSize();

    if (width > height) {
      // Landscape Shiprocket page (can contain 1 or 2 labels side by side)
      const boxes = getLandscapeLabelBoxes(page);
      for (const box of boxes) {
        labels.push({ page, box });
      }
    } else {
      // Standard portrait or legacy page
      const box: CropBox = { left: 14.17, bottom: 297.64, right: 420.94, top: 581.11 };
      labels.push({ page, box });
    }
  }

  if (labels.length === 0) {
    throw new Error('No shipping labels found in the PDF.');
  }

  const NATIVE_W = 406.77;
  const NATIVE_H = 283.47;
  const ASPECT = NATIVE_W / NATIVE_H; // ~1.435

  if (layout === '2_on_1') {
    const marginX = (A4_W - NATIVE_W) / 2;
    const marginY = 50;

    let curPage: any = null;
    let slot = 0;

    for (let i = 0; i < labels.length; i++) {
      if (slot % 2 === 0) {
        curPage = outDoc.addPage([A4_W, A4_H]);
        slot = 0;
      }

      const y = slot === 0 ? A4_H - marginY - NATIVE_H : marginY;
      const { page, box } = labels[i];
      const embedded = await outDoc.embedPage(page, box);
      curPage.drawPage(embedded, {
        x: marginX,
        y,
        width: NATIVE_W,
        height: NATIVE_H,
      });

      slot++;
    }
  } else if (layout === '8_on_1') {
    // 8 labels per A4 portrait page: 2 columns × 4 rows
    const marginX = 15;
    const marginY = 12;
    const gapX = 10;
    const gapY = 10;

    const targetW = (A4_W - 2 * marginX - gapX) / 2; // ~277.6 pt
    const targetH = targetW / ASPECT; // ~193.5 pt

    let curPage: any = null;
    let slot = 0;

    for (let i = 0; i < labels.length; i++) {
      if (slot % 8 === 0) {
        curPage = outDoc.addPage([A4_W, A4_H]);
        slot = 0;
      }

      const col = slot % 2; // 0 = left, 1 = right
      const row = Math.floor(slot / 2); // 0 = top → 3 = bottom

      const x = marginX + col * (targetW + gapX);
      const y = A4_H - marginY - (row + 1) * targetH - row * gapY;

      const { page, box } = labels[i];
      const embedded = await outDoc.embedPage(page, box);
      curPage.drawPage(embedded, {
        x,
        y,
        width: targetW,
        height: targetH,
      });

      slot++;
    }
  } else {
    // 4 labels per A4 portrait page: 2x2 grid
    const marginX = 20;
    const marginY = 35;
    const gapX = 15;
    const gapY = 30;

    const targetW = (A4_W - 2 * marginX - gapX) / 2; // ~270 pt
    const targetH = targetW / ASPECT; // ~188 pt

    let curPage: any = null;
    let slot = 0;

    for (let i = 0; i < labels.length; i++) {
      if (slot % 4 === 0) {
        curPage = outDoc.addPage([A4_W, A4_H]);
        slot = 0;
      }

      const col = slot % 2;
      const row = Math.floor(slot / 2);

      const x = marginX + col * (targetW + gapX);
      const y = A4_H - marginY - (row + 1) * targetH - row * gapY;

      const { page, box } = labels[i];
      const embedded = await outDoc.embedPage(page, box);
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
