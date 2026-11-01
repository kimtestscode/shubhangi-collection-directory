-- Shubhangi Collection: Product Attributes Migration
-- Adds full support for the modernized product inventory form

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS jewelry_type TEXT DEFAULT 'imitation';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rack_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slot_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_chart_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_includes_shipping BOOLEAN DEFAULT false;

