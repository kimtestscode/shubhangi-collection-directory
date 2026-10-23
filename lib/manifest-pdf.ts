import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ManifestParcelItem {
  order_number: string;
  tracking_number: string;
  customer_name: string;
  customer_city: string;
  customer_pincode: string;
  weight_kg?: number;
  courier_name?: string;
}

export interface ManifestOptions {
  pickupDate?: string;
  transporterName?: string;
  pickupLocation?: string;
  parcels: ManifestParcelItem[];
}

/** Sanitize text to pure WinAnsi/ASCII printable characters for standard Helvetica */
function cleanAscii(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[^\x20-\x7E]/g, '') // strip non-ascii
    .trim();
}

/**
 * Generates an A4 Portrait PDF containing 2 identical pickup manifest copies
 * (Top: Store Copy, Bottom: Transporter Copy) for the delivery person to sign.
 */
export async function generatePickupManifestPdf(options: ManifestOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const HALF_HEIGHT = PAGE_HEIGHT / 2; // 420.94 pt

  const parcels = options.parcels || [];
  const pickupDate =
    cleanAscii(options.pickupDate) ||
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const transporter = cleanAscii(options.transporterName) || 'Shiprocket / Delhivery Surface';
  const pickupLoc = cleanAscii(options.pickupLocation) || 'Kamothe, Navi Mumbai (410209)';

  // Max parcels per half page (6-7 fits comfortably with signature blocks)
  const ITEMS_PER_HALF = 6;
  const totalPages = Math.max(1, Math.ceil(parcels.length / ITEMS_PER_HALF));

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const pageParcels = parcels.slice(pageIdx * ITEMS_PER_HALF, (pageIdx + 1) * ITEMS_PER_HALF);

    // Draw Top Half (Store Copy)
    drawManifestHalf(page, {
      yOffset: HALF_HEIGHT,
      halfHeight: HALF_HEIGHT,
      copyLabel: 'STORE / SENDER COPY',
      copyColor: rgb(0.12, 0.44, 0.27), // deep forest green
      pageIdx: pageIdx + 1,
      totalPages,
      parcels: pageParcels,
      startIdx: pageIdx * ITEMS_PER_HALF + 1,
      totalParcelsCount: parcels.length,
      pickupDate,
      transporter,
      pickupLoc,
      fontRegular,
      fontBold,
    });

    // Draw Middle Dotted Cut Line
    drawDottedLine(page, 20, HALF_HEIGHT, PAGE_WIDTH - 20, HALF_HEIGHT, fontRegular);

    // Draw Bottom Half (Courier Copy)
    drawManifestHalf(page, {
      yOffset: 0,
      halfHeight: HALF_HEIGHT,
      copyLabel: 'TRANSPORTER / COURIER RIDER COPY',
      copyColor: rgb(0.15, 0.25, 0.45), // navy blue
      pageIdx: pageIdx + 1,
      totalPages,
      parcels: pageParcels,
      startIdx: pageIdx * ITEMS_PER_HALF + 1,
      totalParcelsCount: parcels.length,
      pickupDate,
      transporter,
      pickupLoc,
      fontRegular,
      fontBold,
    });
  }

  return await doc.save();
}

function drawDottedLine(page: any, x1: number, y1: number, x2: number, y2: number, font: any) {
  // Line
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.8,
    color: rgb(0.65, 0.65, 0.65),
    dashArray: [4, 4],
  });

  const label = '- - - - - - - - - - - - - - - - - - CUT HERE - - - - - - - - - - - - - - - - - -';
  const textWidth = font.widthOfTextAtSize(label, 7.5);
  const cx = (x1 + x2) / 2 - textWidth / 2;

  // Background box for label
  page.drawRectangle({
    x: cx - 4,
    y: y1 - 4,
    width: textWidth + 8,
    height: 8,
    color: rgb(1, 1, 1),
  });

  page.drawText(label, {
    x: cx,
    y: y1 - 2.5,
    size: 7.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}

interface DrawHalfParams {
  yOffset: number;
  halfHeight: number;
  copyLabel: string;
  copyColor: any;
  pageIdx: number;
  totalPages: number;
  parcels: ManifestParcelItem[];
  startIdx: number;
  totalParcelsCount: number;
  pickupDate: string;
  transporter: string;
  pickupLoc: string;
  fontRegular: any;
  fontBold: any;
}

function drawManifestHalf(page: any, p: DrawHalfParams) {
  const marginX = 24;
  const contentWidth = 595.28 - marginX * 2;
  const topY = p.yOffset + p.halfHeight - 16;

  // Header: Store Name & Title
  page.drawText('SHUBHANGI COLLECTION', {
    x: marginX,
    y: topY,
    size: 11,
    font: p.fontBold,
    color: rgb(0.12, 0.12, 0.12),
  });

  page.drawText('Shop No. 3, Manav CHS, Plot 39, Sector-21, Kamothe, Navi Mumbai - 410209 | Mob: 9773915478 / 9004954792', {
    x: marginX,
    y: topY - 11,
    size: 7,
    font: p.fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  // Document Title Banner & Copy Badge
  const bannerY = topY - 32;
  page.drawRectangle({
    x: marginX,
    y: bannerY,
    width: contentWidth,
    height: 18,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  });

  page.drawText('COURIER PICKUP MANIFEST / HANDOVER SLIP', {
    x: marginX + 8,
    y: bannerY + 5,
    size: 8.5,
    font: p.fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Badge on the right
  const badgeWidth = p.fontBold.widthOfTextAtSize(p.copyLabel, 7.5) + 12;
  page.drawRectangle({
    x: marginX + contentWidth - badgeWidth - 4,
    y: bannerY + 2.5,
    width: badgeWidth,
    height: 13,
    color: p.copyColor,
  });

  page.drawText(p.copyLabel, {
    x: marginX + contentWidth - badgeWidth + 6,
    y: bannerY + 5.5,
    size: 7,
    font: p.fontBold,
    color: rgb(1, 1, 1),
  });

  // Metadata Row
  const metaY = bannerY - 16;
  page.drawText(`Pickup Date: ${cleanAscii(p.pickupDate)}`, {
    x: marginX,
    y: metaY,
    size: 7.5,
    font: p.fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Courier / Transporter: ${cleanAscii(p.transporter)}`, {
    x: marginX + 170,
    y: metaY,
    size: 7.5,
    font: p.fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Total Parcels: ${p.totalParcelsCount} (Page ${p.pageIdx} of ${p.totalPages})`, {
    x: marginX + 380,
    y: metaY,
    size: 7.5,
    font: p.fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Parcels Table
  const tableY = metaY - 10;
  const colWidths = [24, 60, 115, 130, 95, 55, 45]; // Total = 524 pt
  const colHeaders = ['#', 'Order No', 'AWB / Docket No', 'Customer Name', 'City / Area', 'Pincode', 'Weight'];

  // Table Header Row
  page.drawRectangle({
    x: marginX,
    y: tableY - 14,
    width: contentWidth,
    height: 14,
    color: rgb(0.9, 0.92, 0.95),
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.5,
  });

  let curX = marginX;
  colHeaders.forEach((hdr, i) => {
    page.drawText(hdr, {
      x: curX + 4,
      y: tableY - 10,
      size: 7,
      font: p.fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    curX += colWidths[i];
  });

  // Table Rows (up to 6)
  let rowY = tableY - 14;
  const rowHeight = 16.5;

  p.parcels.forEach((item, idx) => {
    rowY -= rowHeight;
    const isAlt = idx % 2 === 1;

    page.drawRectangle({
      x: marginX,
      y: rowY,
      width: contentWidth,
      height: rowHeight,
      color: isAlt ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5,
    });

    const values = [
      String(p.startIdx + idx),
      `#${cleanAscii(item.order_number)}`,
      cleanAscii(item.tracking_number) || 'Pending AWB',
      cleanAscii(item.customer_name || 'Customer').slice(0, 24),
      cleanAscii(item.customer_city || '-').slice(0, 18),
      cleanAscii(item.customer_pincode || '-'),
      item.weight_kg ? `${item.weight_kg} kg` : '0.20 kg',
    ];

    let cellX = marginX;
    values.forEach((val, i) => {
      const isAwb = i === 2;
      page.drawText(val, {
        x: cellX + 4,
        y: rowY + 5,
        size: isAwb ? 7.5 : 7,
        font: isAwb ? p.fontBold : p.fontRegular,
        color: isAwb ? rgb(0.1, 0.2, 0.6) : rgb(0.15, 0.15, 0.15),
      });
      cellX += colWidths[i];
    });
  });

  // Signatures & Verification Block
  const sigBoxY = p.yOffset + 18;
  const sigBoxHeight = 56;
  const boxWidth = (contentWidth - 12) / 2;

  // Left: Sender Box
  page.drawRectangle({
    x: marginX,
    y: sigBoxY,
    width: boxWidth,
    height: sigBoxHeight,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.5,
    color: rgb(0.99, 0.99, 0.99),
  });

  page.drawText('HANDED OVER BY (Store Representative):', {
    x: marginX + 6,
    y: sigBoxY + sigBoxHeight - 11,
    size: 7,
    font: p.fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('Shubhangi Collection (Kamothe)', {
    x: marginX + 6,
    y: sigBoxY + sigBoxHeight - 22,
    size: 7,
    font: p.fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawText('Authorized Signature: __________________________', {
    x: marginX + 6,
    y: sigBoxY + 10,
    size: 7,
    font: p.fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Right: Courier Rider Box
  const rightBoxX = marginX + boxWidth + 12;
  page.drawRectangle({
    x: rightBoxX,
    y: sigBoxY,
    width: boxWidth,
    height: sigBoxHeight,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.5,
    color: rgb(0.99, 0.99, 0.99),
  });

  page.drawText('RECEIVED IN GOOD CONDITION BY (Delivery Person):', {
    x: rightBoxX + 6,
    y: sigBoxY + sigBoxHeight - 11,
    size: 7,
    font: p.fontBold,
    color: rgb(0.15, 0.2, 0.5),
  });

  page.drawText('Rider Name : ____________________   Phone : ______________', {
    x: rightBoxX + 6,
    y: sigBoxY + sigBoxHeight - 24,
    size: 6.8,
    font: p.fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('Rider Signature: __________________   Date & Time: _________', {
    x: rightBoxX + 6,
    y: sigBoxY + 10,
    size: 6.8,
    font: p.fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
}
