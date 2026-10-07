export interface ShippingEntry {
  id: string;
  order_number: string;
  shipped_at: string;
  handed_to: string | null;
  notes: string | null;
}

/**
 * Normalise whatever a scanner produced into a clean order number.
 * QR codes contain just the number (e.g. "14257"), but a hand-typed or
 * hardware-scanned value may carry "Order No-", asterisks, spaces etc.
 * Order numbers are 4+ digits, same rule as the address parser.
 */
export function normalizeOrderNumber(raw: string): string {
  const text = (raw ?? '').replace(/\*/g, '').trim();
  const digits = text.match(/(\d{4,})/);
  return digits ? digits[1] : text.toUpperCase();
}

const IST = 'Asia/Kolkata';

/** "07 Oct 2026, 5:31 pm" in Indian time. */
export function formatShippedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "2026-10-07" in Indian time, for grouping/filtering by day. */
export function istDateKey(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });
}
