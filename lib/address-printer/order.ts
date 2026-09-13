// Order data types for Shubhangi Collection Address Printer

export interface OrderTo {
  name: string;
  address: string;
  landmark?: string;
  district?: string;
  city?: string;
  state?: string;
  pincode?: string;
  mobile?: string;
}

export interface OrderFrom {
  name?: string;
  phone?: string;
  address?: string;
  rawBlock: string; // Always preserved
}

export interface Order {
  id: string;           // UUID for React keys
  orderNumber: string;
  to: OrderTo;
  from: OrderFrom;
  rawText: string;      // Original text — never discarded
  warnings: string[];
}

export interface LayoutBlock {
  order: Order;
  estimatedHeight: number; // px
}

export interface LayoutColumn {
  blocks: LayoutBlock[];
  usedHeight: number;
}

export interface LayoutPage {
  columns: LayoutColumn[];
}
