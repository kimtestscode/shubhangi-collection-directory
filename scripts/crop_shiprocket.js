const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function cropShiprocketPdf(inputPath, outputPath) {
  const pdfBytes = fs.readFileSync(inputPath);
  const srcDoc = await PDFDocument.load(pdfBytes);
  const outDoc = await PDFDocument.create();

  const A4_W = 595.28;
  const A4_H = 841.89;

  // Labels are on even pages (0, 2, 4...)
  const labelIndices = [];
  for (let i = 0; i < srcDoc.getPageCount(); i += 2) {
    labelIndices.push(i);
  }

  // 4 labels per A4 page (2x2 grid)
  const marginX = 20;
  const marginY = 30;
  const gapX = 15;
  const gapY = 25;
  const targetW = (A4_W - 2 * marginX - gapX) / 2; // ~270 pt
  const targetH = targetW / (406.77 / 283.47); // ~188 pt

  let currentPage = null;
  let slot = 0;

  for (let i = 0; i < labelIndices.length; i++) {
    if (slot % 4 === 0) {
      currentPage = outDoc.addPage([A4_W, A4_H]);
      slot = 0;
    }

    const col = slot % 2;
    const row = Math.floor(slot / 2); // 0 = top, 1 = bottom

    const x = marginX + col * (targetW + gapX);
    const y = A4_H - marginY - (row + 1) * targetH - row * gapY;

    const embedded = await outDoc.embedPage(srcDoc.getPage(labelIndices[i]), {
      left: 14.17,
      bottom: 297.64,
      right: 420.94,
      top: 581.11,
    });

    currentPage.drawPage(embedded, {
      x,
      y,
      width: targetW,
      height: targetH,
    });

    slot++;
  }

  const outBytes = await outDoc.save();
  fs.writeFileSync(outputPath, outBytes);
  console.log(`Saved 4-on-A4 cropped PDF to ${outputPath}!`);
}

cropShiprocketPdf(
  'combined_label_invoice_4937786_1792077725_27c7bb44-898b-4286-95a4-8a20f40deb19.pdf',
  'Shiprocket_Labels_4_on_A4.pdf'
).catch(console.error);
