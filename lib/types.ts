export type Availability = 'available' | 'out_of_stock' | 'coming_soon' | 'hidden';
export type ProductType = 'simple' | 'variable' | 'variation';

/** A single inline variant row stored as JSONB on the product */
export interface InlineVariant {
  name: string;           // e.g. "Round Floral" or "Red / Small"
  sku: string;
  barcode: string;
  price_override: number | null;
  stock: number;
  image: string;          // single image URL for this variant
}

/** An option type definition, e.g. { type: "Pattern", values: ["Round Floral", "Peacock"] } */
export interface OptionType {
  type: string;           // e.g. "Color", "Size", "Pattern"
  values: string[];       // e.g. ["Round Floral", "Peacock"]
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number | null;
  regular_price?: number | null;
  currency: string;
  availability: Availability;
  images: string[];
  thumbnail: string | null;
  featured: boolean;
  // --- Old variant system (kept for backward compat) ---
  product_type: ProductType;
  parent_sku: string | null;
  color: string | null;
  variant_type: string | null;
  // --- New inline variant system ---
  has_variants: boolean;
  option_types: OptionType[] | null;
  variants: InlineVariant[] | null;
  created_at: string;
  updated_at: string;
}

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate = Partial<ProductInsert>;

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  product_count?: number;
  created_at: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  availability?: Availability | 'all';
}

/** Legacy variant (from old parent/variation system) — used for backward compat on product page */
export interface ProductVariant {
  sku: string;
  name: string;
  slug: string;
  variantValue: string;
  images: string[];
  thumbnail: string | null;
  isCurrent: boolean;
  availability: Availability;
  price: number | null;
  regular_price: number | null;
}
