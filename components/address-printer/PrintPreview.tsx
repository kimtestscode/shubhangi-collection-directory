'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { Order, LayoutPage, LayoutColumn } from '@/lib/address-printer/order';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';

interface Props {
  orders: Order[];
  onBack: () => void;
  onClear: () => void;
}

// ─── Shared print font ────────────────────────────────────────────────────────
const PRINT_FONT: React.CSSProperties = {
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: '11pt',
  lineHeight: '1.35',
  color: '#000',
};

// ─── Address block (shared by measurement + print) ───────────────────────────

function AddressBlock({ order }: { order: Order }) {
  const { to, from } = order;
  const location = [to.district || to.city, to.state].filter(Boolean).join(', ');

  return (
    <div
      className="addr-block"
      style={{
        ...PRINT_FONT,
        borderBottom: '0.8pt solid #999',
        paddingBottom: '4pt',
        marginBottom: '6pt',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        boxSizing: 'border-box',
      }}
    >
      {/* Order heading */}
      <div style={{ fontWeight: 700, marginBottom: '2pt', fontSize: '11.5pt' }}>
        ORDER NO. {order.orderNumber}
      </div>

      {/* To section */}
      <div>
        <span style={{ fontWeight: 600 }}>To,</span>
        <br />
        {to.name && (
          <>
            {to.name}
            <br />
          </>
        )}
        {to.address &&
          to.address
            .split('\n')
            .filter((l) => l.trim().length > 0)
            .map((l, i) => (
              <React.Fragment key={i}>
                {l}
                <br />
              </React.Fragment>
            ))}
        {to.landmark && (
          <>
            Landmark: {to.landmark}
            <br />
          </>
        )}
        {location && (
          <>
            {location}
            <br />
          </>
        )}
        {to.pincode && (
          <>
            Pincode: {to.pincode}
            <br />
          </>
        )}
        {to.mobile && <>Mobile: {to.mobile}</>}
      </div>

      {/* From section */}
      <div style={{ marginTop: '3pt' }}>
        {from.rawBlock ? (
          <>
            <span style={{ fontWeight: 600 }}>From,</span>
            <br />
            {from.rawBlock
              .split('\n')
              .filter((l) => l.trim().length > 0)
              .map((l, i) => (
                <React.Fragment key={i}>
                  {l}
                  <br />
                </React.Fragment>
              ))}
          </>
        ) : (
          <span style={{ color: '#b45309', fontStyle: 'italic', fontSize: '9pt' }}>
            ⚠ From / reseller information missing
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Bin-packing ──────────────────────────────────────────────────────────────
const PAGE_HEIGHT_PX = 1020;
const NUM_COLS = 3;
export const COLUMN_WIDTH_PX = 232;

interface MeasuredOrder {
  order: Order;
  height: number;
}

function packIntoPages(measured: MeasuredOrder[]): LayoutPage[] {
  const pages: LayoutPage[] = [];

  function newPage(): LayoutPage {
    return {
      columns: Array.from({ length: NUM_COLS }, () => ({
        blocks: [],
        usedHeight: 0,
      })) as LayoutColumn[],
    };
  }

  let page = newPage();
  pages.push(page);
  let colIdx = 0;

  for (const m of measured) {
    let placed = false;
    for (let c = colIdx; c < NUM_COLS; c++) {
      const col = page.columns[c];
      if (col.usedHeight + m.height <= PAGE_HEIGHT_PX) {
        col.blocks.push({ order: m.order, estimatedHeight: m.height });
        col.usedHeight += m.height;
        colIdx = c;
        placed = true;
        break;
      }
    }
    if (!placed) {
      page = newPage();
      pages.push(page);
      colIdx = 0;
      page.columns[0].blocks.push({ order: m.order, estimatedHeight: m.height });
      page.columns[0].usedHeight += m.height;
    }
  }

  return pages;
}

// ─── Main PrintPreview ────────────────────────────────────────────────────────

export default function PrintPreview({ orders, onBack, onClear }: Props) {
  const [pages, setPages] = useState<LayoutPage[] | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setPages(null);
  }, [orders]);

  useLayoutEffect(() => {
    if (pages !== null) return;
    const container = measureRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length !== orders.length) return;

    const measured: MeasuredOrder[] = orders.map((order, i) => ({
      order,
      height: (children[i].offsetHeight || 60) + 8,
    }));

    setPages(packIntoPages(measured));
  });

  const pageCount = pages?.length ?? 0;
  const orderCount = orders.length;

  return (
    <div className="min-h-screen bg-ivory-dark print:bg-white print:min-h-0 print:p-0">
      {/* Off-screen measurement container */}
      <div
        className="no-print"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: `${COLUMN_WIDTH_PX}px`,
          visibility: 'hidden',
          pointerEvents: 'none',
          ...PRINT_FONT,
        }}
      >
        {pages === null && (
          <div ref={measureRef}>
            {orders.map((o) => (
              <AddressBlock key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>

      {/* Screen Controls */}
      <div className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-xs border-b border-border-warm px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-serif font-semibold text-charcoal">Print Preview (A4 Packing)</h2>
          {pages ? (
            <p className="text-xs text-charcoal-light font-medium">
              <span className="text-gold font-bold">{orderCount}</span> order{orderCount !== 1 ? 's' : ''} •{' '}
              <span className="text-gold font-bold">{pageCount}</span> A4 page{pageCount !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-xs text-charcoal-light/60">Calculating layout…</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-border-warm text-charcoal hover:bg-ivory-dark transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Review
          </button>
          <button
            onClick={() => window.print()}
            disabled={!pages}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-gold text-white font-medium hover:bg-gold/90 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Unified A4 Pages */}
      <div className="flex flex-col items-center py-8 gap-8 print:py-0 print:gap-0 print:block">
        {pages ? (
          pages.map((page, pi) => (
            <div
              key={pi}
              className="print-page-wrapper mb-8 print:mb-0 print:p-0 print:m-0"
            >
              {/* Screen page indicator */}
              <div className="no-print text-center text-xs text-charcoal-light font-medium mb-2">
                Page {pi + 1} of {pageCount} (A4 Sheet)
              </div>

              {/* A4 Sheet Container */}
              <div className="a4-page shadow-md print:shadow-none bg-white">
                {page.columns.map((col, ci) => (
                  <div key={ci} className="a4-column flex flex-col min-w-0">
                    {col.blocks.map((block) => (
                      <AddressBlock key={block.order.id} order={block.order} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-charcoal-light">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Measuring blocks and generating A4 layout…</p>
          </div>
        )}
      </div>
    </div>
  );
}
