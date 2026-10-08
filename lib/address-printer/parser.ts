/**
 * WhatsApp batch address parser for Shubhangi Collection.
 *
 * Tolerates:
 * - asterisks (*order no-14290*)
 * - dashes, colons, spaces in labels
 * - inconsistent blank lines
 * - capitalization differences
 * - slightly different field names
 */

import { Order, OrderFrom, OrderTo } from './order';

// ─── helpers ────────────────────────────────────────────────────────────────

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Strip WhatsApp bold markers (*text*) and trim.
 */
function clean(s: string): string {
  return s.replace(/\*/g, '').trim();
}

/**
 * Detect the order-number line.
 * Matches any variant of:
 *   *Order no-14290*  /  Order No: 14290  /  order no - 14290  /  Order No. 14252
 */
const ORDER_NO_RE = /\*?\s*order\s*no[\s\.\-:]*\s*(\d{4,})\s*\*?/i;

/**
 * Test whether a line is an order-number line.
 */
function isOrderLine(line: string): boolean {
  return ORDER_NO_RE.test(line);
}

/**
 * Extract order number from line.
 */
function extractOrderNumber(line: string): string {
  const m = clean(line).match(ORDER_NO_RE);
  return m ? m[1] : line;
}

// ─── field label patterns ───────────────────────────────────────────────────

type FieldKey =
  | 'name'
  | 'address'
  | 'landmark'
  | 'district'
  | 'city'
  | 'state'
  | 'pincode'
  | 'mobile'
  | 'from';

const FIELD_PATTERNS: [FieldKey, RegExp][] = [
  ['name', /^(?:customer\s*name|cust\s*name|name)\b[\s\-:.]*/i],
  ['address', /^(?:full\s*address|address|add)\b[\s\-:.]+/i],
  ['landmark', /^(?:landmark|nearby|near)\b[\s\-:.]*/i],
  ['district', /^(?:tal\s*district|taluka|district|tehsil|tal)\b[\s\-:.]*/i],
  ['city', /^(?:city|town|village)\b[\s\-:.]*/i],
  ['state', /^(?:state)\b[\s\-:.]*/i],
  ['pincode', /^(?:correct\s*pincode|pincode|pin\s*code|pin)\b[\s\-:.]*/i],
  ['mobile', /^(?:mobile\s*no|mobaile\s*no|mob\s*no|phone\s*no|contact\s*no|mobile|mobaile|mob|ph|phone|contact)\b[\s\-:.]*/i],
  ['from', /^from\s*[,]?\s*$/i],
];

function detectField(line: string): FieldKey | null {
  const stripped = clean(line);
  for (const [key, re] of FIELD_PATTERNS) {
    if (re.test(stripped)) return key;
  }
  return null;
}

/**
 * Extract value after the label separator.
 * Handles: "Name - Rupali", "Name: Rupali", "Name.. Rupali", "Pincode 415639", "mobaile no 9324576392", "Tal district ... ratnagiri"
 */
function extractValue(line: string): string {
  const stripped = clean(line);
  return stripped
    .replace(
      /^(?:customer\s*name|cust\s*name|name|full\s*address|address|add|landmark|nearby|near|tal\s*district|taluka|district|tehsil|tal|city|town|village|state|correct\s*pincode|pincode|pin\s*code|pin|mobile\s*no|mobaile\s*no|mob\s*no|phone\s*no|contact\s*no|mobile|mobaile|mob|ph|phone|contact)\b[\s\-:.]*/i,
      ''
    )
    .trim();
}

/**
 * Normalize pincode: remove spaces, warn if not 6 digits.
 */
function normalizePincode(raw: string): { value: string; warn?: string } {
  const digits = raw.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(digits)) {
    return { value: digits || raw, warn: 'Pincode does not look like a valid 6-digit Indian pincode' };
  }
  return { value: digits };
}

// ─── timestamp / chat-noise patterns to skip everywhere ─────────────────────

// Matches WhatsApp chat timestamps and date headers
const CHAT_NOISE_RE =
  /^(?:\[?\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:AM|PM|am|pm)\]?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)|TODAY|YESTERDAY|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{0,4})$/i;

function isChatNoise(line: string): boolean {
  return CHAT_NOISE_RE.test(line.trim());
}

// ─── split batch into raw order blocks ──────────────────────────────────────

function splitIntoRawBlocks(text: string): { preamble: string; blocks: string[] } {
  const lines = text.split(/\r?\n/);
  let preambleLines: string[] = [];
  let blocks: string[] = [];
  let current: string[] = [];
  let foundFirst = false;

  for (const line of lines) {
    // Drop WhatsApp chat timestamps / date headers before splitting
    if (isChatNoise(clean(line))) continue;

    if (isOrderLine(line)) {
      if (!foundFirst) {
        preambleLines = current;
        foundFirst = true;
        current = [line];
      } else {
        blocks.push(current.join('\n'));
        current = [line];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0 && foundFirst) {
    blocks.push(current.join('\n'));
  } else if (current.length > 0) {
    preambleLines = [...preambleLines, ...current];
  }

  return {
    preamble: preambleLines.join('\n').trim(),
    blocks,
  };
}

// ─── parse a single raw order block ─────────────────────────────────────────

function parseOrderBlock(raw: string): Order {
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/);

  // First line is always the order number line
  const orderNumber = extractOrderNumber(lines[0]);

  const to: OrderTo = {
    name: '',
    address: '',
  };
  const from: OrderFrom = {
    rawBlock: '',
  };

  let currentField: FieldKey | null = null;
  let inFrom = false;
  let fromLines: string[] = [];
  let addressLines: string[] = [];
  let unknownLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw_line = lines[i];
    const line = clean(raw_line);

    if (!line) continue; // skip blank lines

    // Skip WhatsApp chat timestamps / date headers inside a block
    if (isChatNoise(line)) continue;

    // Skip "To," section-marker
    if (/^to\s*,?\s*$/i.test(line)) continue;

    const detected = detectField(line);

    if (detected === 'from') {
      inFrom = true;
      currentField = 'from';
      continue;
    }

    if (inFrom) {
      fromLines.push(line);
      continue;
    }

    if (detected) {
      currentField = detected;
      const val = extractValue(line);

      switch (detected) {
        case 'name':
          to.name = val;
          break;
        case 'address':
          if (val) addressLines.push(val);
          break;
        case 'landmark':
          to.landmark = val;
          break;
        case 'district':
          to.district = val;
          break;
        case 'city':
          to.city = val;
          break;
        case 'state':
          to.state = val;
          break;
        case 'pincode': {
          const { value, warn } = normalizePincode(val);
          to.pincode = value;
          if (warn) warnings.push(warn);
          break;
        }
        case 'mobile':
          to.mobile = val;
          break;
      }
    } else {
      // Unrecognized line — keep as continuation of current field or address
      if (currentField === 'address') {
        addressLines.push(line);
      } else if (currentField === 'name' && !to.address) {
        // Sometimes address starts right after name without a label
        addressLines.push(line);
        currentField = 'address';
      } else {
        unknownLines.push(line);
      }
    }
  }

  to.address = addressLines.join('\n');

  // Append unknown lines to address so nothing is lost
  if (unknownLines.length > 0) {
    if (to.address) {
      to.address += '\n' + unknownLines.join('\n');
    } else {
      to.address = unknownLines.join('\n');
    }
  }

  // Parse From block
  from.rawBlock = fromLines.join('\n');
  if (fromLines.length > 0) {
    from.name = fromLines[0];
    // Look for phone in remaining lines
    for (const fl of fromLines.slice(1)) {
      const mobMatch = fl.match(/(mob|phone|ph)\s*[-:]+\s*(.+)/i);
      if (mobMatch) {
        from.phone = mobMatch[2];
      } else if (/^\d[\d\s\/\-]+$/.test(fl)) {
        // Raw number line
        from.phone = from.phone ? from.phone + ' / ' + fl : fl;
      } else if (fl && !from.address) {
        from.address = fl;
      }
    }
  }

  // ─── warnings ─────────────────────────────────────────────────────────────
  if (!to.name) warnings.push('Recipient name not detected');
  if (!to.address) warnings.push('Address not detected');
  if (!to.mobile) {
    warnings.push('Mobile number not detected');
  } else {
    const cleanDigits = to.mobile.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      warnings.push(`Mobile number has fewer than 10 digits (${to.mobile})`);
    }
  }
  if (!to.pincode) warnings.push('Pincode not detected');
  if (!from.rawBlock) warnings.push('From / reseller information missing');

  return {
    id: uuid(),
    orderNumber,
    to,
    from,
    rawText: raw,
    warnings,
  };
}

// ─── public API ─────────────────────────────────────────────────────────────

export interface ParseResult {
  orders: Order[];
  preamble: string; // Text before first order — flagged for review
  duplicates: string[]; // Order numbers that appear more than once
}

export function parseWhatsAppBatch(text: string): ParseResult {
  const { preamble, blocks } = splitIntoRawBlocks(text.trim());
  const orders = blocks.map(parseOrderBlock);

  // Detect duplicates
  const seen = new Map<string, number>();
  for (const o of orders) {
    seen.set(o.orderNumber, (seen.get(o.orderNumber) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([num]) => num);

  // Add duplicate warning to affected orders
  for (const o of orders) {
    if (duplicates.includes(o.orderNumber)) {
      if (!o.warnings.some((w) => w.includes('Duplicate'))) {
        o.warnings.push(`Duplicate order number: ${o.orderNumber}`);
      }
    }
  }

  return { orders, preamble, duplicates };
}

// ─── sample data ────────────────────────────────────────────────────────────

export const SAMPLE_DATA = `*order no-14257*
To,
Name - Priya Sharma
Address:-
B-204, Sunflower CHS, Sector 19, Kharghar
Landmark - Near Railway Station
District - Raigad
State - Maharashtra
Correct Pincode - 410 210
Mobile - 9876543210

From,
Shubhangi Collection
Mob :- 9773915478
9004954792

*Order no-14255*
To,
Name - Rahul Mehta
Address - 12, Ram Nagar, Opp. SBI Bank, Andheri West
District - Mumbai
State - Maharashtra
Pincode: 400058
Mob: 9867432100

From,
Shubhangi Collection
Mob :- 9773915478
9004954792

*Order no-14251*
To,
Customer Name - Kavita Joshi
Full Address -
Lalbaugcha Raja Co. Op. Soc., Room no. 207, B wing, 2nd floor,
Dr. B.A. Road, Lalbaug Mkt., Mumbai 12
Landmark - Near Garamkhada Ground
District - Mumbai
State - Maharashtra
Correct Pincode - 400012
Mobile - 9820992271

From,
Nikita Patil
Phone - 8390345854

*Order no-14249*
To,
Name - Sunita Rao
Address - 45 MG Road, Pune
State - Maharashtra
Pincode - 411001
Ph - 9823456789

From,
Shubhangi Collection
Mob :- 9773915478

*Order No: 14254*
To,
Name: Deepa Nair
Address: Flat 3B, Lotus Heights, Vashi, Navi Mumbai
Landmark: Near Inorbit Mall
District: Thane
State: Maharashtra
Pincode: 400703
Mobile: 9819876543

From,
Aarohi Fashion
Mob: 9820123456

*Order no-14253*
To,
Name - Pooja Verma
Address - 88, Lake View Apartments, Powai
District - Mumbai
State - Maharashtra
Pincode - 400076
Mobile - 9821345678

From,
Shubhangi Collection
Mob :- 9773915478
9004954792

*Order no-14250*
To,
Name - Sneha Kulkarni
Address - Row House 4, Greenfield Society, Kothrud
Landmark - Near Vanaz Corner
City - Pune
State - Maharashtra
Pincode - 411038
Mobile - 9422012345

From,
Shubhangi Collection
Mob :- 9773915478
9004954792

*Order no-14248*
To,
Name - Ananya Iyer
Address - 102, Shanti Niketan, Malleshwaram
City - Bengaluru
State - Karnataka
Pincode - 560003
Mobile - 9845012345

From,
Divine Jewels
Mob: 9900112233

*Order no-14247*
To,
Name - Meera Deshmukh
Address - 23, Shivaji Nagar, Behind Bus Stand
City - Nashik
State - Maharashtra
Pincode - 422002
Mobile - 9890123456

From,
Shubhangi Collection
Mob :- 9773915478
9004954792`;
