export type ShippingStatus = 'pending' | 'picked_up' | 'dispatched';
export type CourierPartner = 'shree_maruti' | 'anjani' | 'india_post' | 'other';

export interface ShippingEntry {
  id: string;
  order_number: string;
  status: ShippingStatus;
  customer_name: string | null;
  customer_mobile: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_pincode: string | null;
  printed_at: string | null;
  shipped_at: string | null;
  handed_to: string | null;
  courier_partner: CourierPartner | null;
  tracking_number: string | null;
  tracking_url: string | null;
  docket_photo_url: string | null;
  shipping_cost: number | null;
  partner_submitted_at: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface CourierMeta {
  id: CourierPartner;
  name: string;
  nameMr: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  website: string;
  getTrackingUrl: (docket: string) => string;
}

export const COURIER_META: Record<CourierPartner, CourierMeta> = {
  shree_maruti: {
    id: 'shree_maruti',
    name: 'Shree Maruti Courier',
    nameMr: 'श्री मारुती कुरिअर',
    color: '#0284c7',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    badgeText: 'text-sky-700',
    website: 'https://www.shreemaruticourier.com',
    getTrackingUrl: (docket: string) =>
      docket.trim()
        ? `https://www.shreemaruticourier.com/track-shipment?tracking_id=${encodeURIComponent(docket.trim())}`
        : 'https://www.shreemaruticourier.com',
  },
  anjani: {
    id: 'anjani',
    name: 'Anjani Courier Services',
    nameMr: 'अंजनी कुरिअर',
    color: '#ea580c',
    badgeBg: 'bg-orange-50',
    badgeBorder: 'border-orange-200',
    badgeText: 'text-orange-700',
    website: 'http://www.anjanicourier.com',
    getTrackingUrl: (docket: string) =>
      docket.trim()
        ? `http://www.anjanicourier.com/track?consignment=${encodeURIComponent(docket.trim())}`
        : 'http://www.anjanicourier.com',
  },
  india_post: {
    id: 'india_post',
    name: 'India Post (स्पीड पोस्ट)',
    nameMr: 'भारतीय डाक (स्पीड पोस्ट)',
    color: '#dc2626',
    badgeBg: 'bg-red-50',
    badgeBorder: 'border-red-200',
    badgeText: 'text-red-700',
    website: 'https://www.indiapost.gov.in',
    getTrackingUrl: (_docket: string) =>
      'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  },
  other: {
    id: 'other',
    name: 'Other Courier',
    nameMr: 'इतर कुरिअर',
    color: '#64748b',
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-700',
    website: '',
    getTrackingUrl: () => '',
  },
};

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

/** Cleans an Indian mobile number to 12 digits (with 91 prefix) */
export function cleanMobileNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length >= 10) return digits; // fallback
  return null;
}

/** Formats a polite, professional WhatsApp message with order & tracking details */
export function buildWhatsAppTrackingMessage(entry: Partial<ShippingEntry>): string {
  const customerName = entry.customer_name?.trim() ? `${entry.customer_name.trim()} ji` : 'ji';
  const orderNo = entry.order_number || '';
  const partner = entry.courier_partner ? COURIER_META[entry.courier_partner] : null;
  const courierName = partner ? partner.name : 'Courier';
  const trackingNo = entry.tracking_number?.trim() || '';
  const trackingUrl = entry.tracking_url?.trim() || (partner ? partner.getTrackingUrl(trackingNo) : '');

  const lines: string[] = [
    `Namaste ${customerName},`,
    '',
    `Your order #${orderNo} from *Shubhangi Collection* has been dispatched! 📦✨`,
    '',
    `🚚 *Courier Partner:* ${courierName}`,
  ];

  if (trackingNo) {
    lines.push(`🔖 *Docket / Tracking No:* ${trackingNo}`);
  }

  if (trackingUrl) {
    if (entry.courier_partner === 'india_post') {
      lines.push(
        `🔗 *Tracking:* ${trackingUrl}`,
        `*(Enter consignment no. & captcha on portal)*`
      );
    } else {
      lines.push(`🔗 *Live Tracking:* ${trackingUrl}`);
    }
  }

  lines.push(
    '',
    `⏳ *Estimated Delivery:*`,
    `• Mumbai: 3–4 business days`,
    `• Maharashtra: 5–12 business days`,
    `• Out of Maharashtra: 7–15 business days`,
    '',
    `Thank you for shopping with *Shubhangi Collection*! 🙏🌸`
  );

  return lines.join('\n');
}

/** Generates wa.me URL for the entry */
export function getWhatsAppUrl(entry: Partial<ShippingEntry>): string | null {
  const mobile = cleanMobileNumber(entry.customer_mobile);
  if (!mobile) return null;
  const message = buildWhatsAppTrackingMessage(entry);
  return `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
}

const IST = 'Asia/Kolkata';

/** "07 Oct 2026, 5:31 pm" in Indian time. */
export function formatShippedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
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
export function istDateKey(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });
}

/** Returns human-readable time elapsed, e.g. "2h ago", "2 days ago" */
export function getTimeElapsed(iso: string | null | undefined): { text: string; hours: number } {
  if (!iso) return { text: '—', hours: 0 };
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return { text: '< 1 hr ago', hours: diffHours };
  if (diffHours < 24) return { text: `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`, hours: diffHours };
  return { text: `${diffDays} day${diffDays > 1 ? 's' : ''} ago`, hours: diffHours };
}
