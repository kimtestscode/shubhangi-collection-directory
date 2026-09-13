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
  color: string | null;
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
