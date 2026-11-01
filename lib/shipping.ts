export type ShippingStatus =
  | 'pending'
  | 'picked_up'
  | 'out_for_delivery'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'rto';

export type CourierPartner =
  | 'shree_maruti'
  | 'anjani'
  | 'india_post'
  | 'delhivery'
  | 'bluedart'
  | 'dtdc'
  | 'xpressbees'
  | 'shadowfax'
  | 'other';

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
  delhivery: {
    id: 'delhivery',
    name: 'Delhivery Surface / Air',
    nameMr: 'डिलिव्हरी',
    color: '#0f766e',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    website: 'https://www.delhivery.com',
    getTrackingUrl: (docket: string) =>
      `https://www.delhivery.com/track/package/${encodeURIComponent(docket.trim())}`,
  },
  bluedart: {
    id: 'bluedart',
    name: 'Blue Dart Air / Surface',
    nameMr: 'ब्लू डार्ट',
    color: '#1d4ed8',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-800',
    website: 'https://www.bluedart.com',
    getTrackingUrl: (docket: string) =>
      `https://www.bluedart.com/tracking?numbers=${encodeURIComponent(docket.trim())}`,
  },
  dtdc: {
    id: 'dtdc',
    name: 'DTDC Express',
    nameMr: 'डीटीडीसी',
    color: '#b91c1c',
    badgeBg: 'bg-red-50',
    badgeBorder: 'border-red-200',
    badgeText: 'text-red-800',
    website: 'https://www.dtdc.in',
    getTrackingUrl: (docket: string) =>
      `https://www.dtdc.in/tracking/tracking_results.asp?trCode=${encodeURIComponent(docket.trim())}`,
  },
  xpressbees: {
    id: 'xpressbees',
    name: 'Xpressbees',
    nameMr: 'एक्सप्रेसबीज',
    color: '#9333ea',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-800',
    website: 'https://www.xpressbees.com',
    getTrackingUrl: (docket: string) =>
      `https://www.xpressbees.com/shipment/tracking?awb=${encodeURIComponent(docket.trim())}`,
  },
  shadowfax: {
    id: 'shadowfax',
    name: 'Shadowfax',
    nameMr: 'शॅडोफॅक्स',
    color: '#0891b2',
    badgeBg: 'bg-cyan-50',
    badgeBorder: 'border-cyan-200',
    badgeText: 'text-cyan-800',
    website: 'https://www.shadowfax.in',
    getTrackingUrl: (docket: string) =>
      `https://tracker.shadowfax.in/#/track?orderId=${encodeURIComponent(docket.trim())}`,
  },
  india_post: {
    id: 'india_post',
    name: 'India Post (स्पीड पोस्ट)',
    nameMr: 'भारतीय डाक (स्पीड पोस्ट)',
    color: '#ea580c',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    website: 'https://www.indiapost.gov.in',
    getTrackingUrl: (_docket: string) =>
      'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  },
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
  other: {
    id: 'other',
    name: 'Shiprocket Courier',
    nameMr: 'शिपरॉकेट कुरिअर',
    color: '#64748b',
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-700',
    website: 'https://shiprocket.co',
    getTrackingUrl: (docket: string) =>
      `https://shiprocket.co/tracking/${encodeURIComponent(docket.trim())}`,
  },
};

/**
 * Smartly resolve the courier metadata based on courier_partner and notes (e.g. "Shiprocket: Delhivery Surface")
 */
export function resolveCourierMeta(
  partner: CourierPartner | string | null | undefined,
  notes: string | null | undefined
): CourierMeta {
  const noteText = String(notes || '').toLowerCase();
  if (partner === 'delhivery' || noteText.includes('delhivery')) return COURIER_META.delhivery;
  if (partner === 'bluedart' || noteText.includes('blue dart') || noteText.includes('bluedart')) return COURIER_META.bluedart;
  if (partner === 'dtdc' || noteText.includes('dtdc')) return COURIER_META.dtdc;
  if (partner === 'xpressbees' || noteText.includes('xpressbees')) return COURIER_META.xpressbees;
  if (partner === 'shadowfax' || noteText.includes('shadowfax')) return COURIER_META.shadowfax;
  if (partner === 'india_post' || noteText.includes('india post') || noteText.includes('speed post')) return COURIER_META.india_post;
  if (partner === 'shree_maruti' || noteText.includes('shree maruti') || noteText.includes('maruti')) return COURIER_META.shree_maruti;
  if (partner === 'anjani' || noteText.includes('anjani')) return COURIER_META.anjani;
  if (partner && COURIER_META[partner as CourierPartner]) return COURIER_META[partner as CourierPartner];
  return COURIER_META.other;
}

/**
 * Returns visual meta (badge background, text color, label) for a given shipping status
 */
export function getShippingStatusMeta(status: string | null | undefined): {
  key: string;
  labelEn: string;
  labelMr: string;
  bg: string;
  text: string;
  border: string;
} {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'delivered') {
    return {
      key: 'delivered',
      labelEn: 'Delivered',
      labelMr: 'डिलिव्हर झाले',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    };
  }
  if (s === 'out_for_delivery') {
    return {
      key: 'out_for_delivery',
      labelEn: 'Out for Delivery / Shipped',
      labelMr: 'कुरिअरकडे दिले / आऊट फॉर डिलिव्हरी',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
    };
  }
  if (s === 'in_transit') {
    return {
      key: 'in_transit',
      labelEn: 'In Transit',
      labelMr: 'मार्गावर आहे (ट्रॅव्हलिंग)',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
    };
  }
  if (s === 'picked_up') {
    return {
      key: 'picked_up',
      labelEn: 'Picked Up (Hub)',
      labelMr: 'पिकअप झाले',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
    };
  }
  if (s === 'dispatched') {
    return {
      key: 'dispatched',
      labelEn: 'Dispatched',
      labelMr: 'डिस्पॅच पूर्ण',
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
    };
  }
  if (s === 'rto' || s === 'undelivered') {
    return {
      key: 'rto',
      labelEn: 'RTO / Undelivered',
      labelMr: 'परत आले (RTO)',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
    };
  }
  return {
    key: 'pending',
    labelEn: 'Pending Handover',
    labelMr: 'पिकअप बाकी',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  };
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
  const partnerMeta = resolveCourierMeta(entry.courier_partner, entry.notes);
  let courierName = partnerMeta.name;
  if (entry.notes && entry.notes.includes('Shiprocket:')) {
    const extracted = entry.notes.replace(/.*Shiprocket:\s*/i, '').split('|')[0].trim();
    if (extracted) courierName = extracted;
  }
  const trackingNo = entry.tracking_number?.trim() || '';
  const trackingUrl = entry.tracking_url?.trim() || (trackingNo ? partnerMeta.getTrackingUrl(trackingNo) : '');

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
