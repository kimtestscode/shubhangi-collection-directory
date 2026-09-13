/**
 * Layout engine for A4 address printing.
 *
 * Uses a bin-packing approach:
 * - 3 columns per A4 page
 * - Variable-height blocks based on actual content
 * - Never splits an order across pages
 * - Fills columns top-to-bottom before moving to the next column
 */

import { Order, LayoutBlock, LayoutColumn, LayoutPage } from './order';

// A4 print dimensions (at 96 dpi screen equivalent)
// A4 = 210mm × 297mm
// Inside margins usable height:
const PAGE_HEIGHT_PX = 1020;
const COLUMN_GAP_PX = 8;
const NUM_COLUMNS = 3;

// Per-line height in px (≈11pt at 96dpi, ~1.35 line-height)
const LINE_HEIGHT_PX = 16;

// Fixed overhead per block: ORDER heading + spacing + From section frame
const BLOCK_OVERHEAD_PX = 65;

// Characters per line in a column (approximate, for line-wrap estimation)
const CHARS_PER_LINE = 32;

function estimateLines(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/);
  let lines = 1;
  let chars = 0;
  for (const w of words) {
    if (chars + w.length + 1 > CHARS_PER_LINE) {
      lines++;
      chars = w.length;
    } else {
      chars += w.length + 1;
    }
  }
  return lines;
}

/**
 * Estimate the rendered height of an address block in pixels.
 */
export function estimateBlockHeight(order: Order): number {
  let lines = 0;

  // ORDER heading
  lines += 2;

  // To section
  if (order.to.name) lines += estimateLines(order.to.name);
  if (order.to.address) lines += estimateLines(order.to.address);
  if (order.to.landmark) lines += estimateLines('Landmark: ' + order.to.landmark);
  if (order.to.district || order.to.city) lines += 1;
  if (order.to.state) lines += 1;
  if (order.to.pincode) lines += 1;
  if (order.to.mobile) lines += 1;

  // From section
  lines += 1; // "From," header
  if (order.from.rawBlock) lines += order.from.rawBlock.split('\n').length;

  return Math.ceil(lines * LINE_HEIGHT_PX) + BLOCK_OVERHEAD_PX;
}

function makeColumn(): LayoutColumn {
  return { blocks: [], usedHeight: 0 };
}

function makePage(): LayoutPage {
  return {
    columns: [makeColumn(), makeColumn(), makeColumn()],
  };
}

/**
 * Distribute orders into pages with 3 variable-height columns each.
 * Fills column 0, then column 1, then column 2, then new page.
 * Never splits an order across pages/columns.
 */
export function buildLayout(orders: Order[]): LayoutPage[] {
  const pages: LayoutPage[] = [];
  let currentPage = makePage();
  let currentColIndex = 0;
  pages.push(currentPage);

  for (const order of orders) {
    const height = estimateBlockHeight(order);
    const block: LayoutBlock = { order, estimatedHeight: height };

    let placed = false;

    // Try to fit into current column first, then subsequent columns on same page
    for (let c = currentColIndex; c < NUM_COLUMNS; c++) {
      const col = currentPage.columns[c];
      if (col.usedHeight + height <= PAGE_HEIGHT_PX) {
        col.blocks.push(block);
        col.usedHeight += height + COLUMN_GAP_PX;
        currentColIndex = c;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Move to next page
      currentPage = makePage();
      pages.push(currentPage);
      currentColIndex = 0;
      const col = currentPage.columns[0];
      col.blocks.push(block);
      col.usedHeight += height + COLUMN_GAP_PX;
    }
  }

  return pages;
}
