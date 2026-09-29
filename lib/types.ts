export type Availability = 'available' | 'out_of_stock' | 'coming_soon' | 'hidden';
export type ProductType = 'simple' | 'variable' | 'variation';

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number | null; // Sale / Offer price
  regular_price?: number | null; // Regular MRP price
  currency: string;
  availability: Availability;
  images: string[];
  thumbnail: string | null;
  featured: boolean;
  product_type: ProductType;
  parent_sku: string | null;
  // variant_type: the dimension of variation (e.g. "Color", "Size", "Material", "Design")
  // stored in the `color` column until DB migration adds `variant_type`
  variant_type: string | null;
  // variant_value: the actual value (e.g. "Red", "XL", "Gold-plated")
  // stored in the `color` column for now — after migration, separate column
  color: string | null; // kept for backward compat; = variant_value
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

/** A single variant as returned for the switcher on product detail page */
export interface ProductVariant {
  sku: string;
  name: string;
  slug: string;
  /** Variant display label (e.g. "Red", "XL") */
  variantValue: string;
  /** Images for this specific variant */
  images: string[];
  thumbnail: string | null;
  isCurrent: boolean;
  availability: Availability;
  price: number | null;
  regular_price: number | null;
}
