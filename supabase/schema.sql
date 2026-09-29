-- Shubhangi Collection - Database Schema (with Flexible Variant System)

CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  category     TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2),
  currency     TEXT DEFAULT 'INR',
  availability TEXT DEFAULT 'available' CHECK (availability IN ('available', 'out_of_stock', 'coming_soon', 'hidden')),
  images       TEXT[] DEFAULT '{}',
  thumbnail    TEXT,
  featured     BOOLEAN DEFAULT false,
  product_type TEXT DEFAULT 'simple' CHECK (product_type IN ('simple', 'variable', 'variation')),
  parent_sku   TEXT,
  color        TEXT,      -- stores the variant_value (e.g. "Red", "XL", "Gold")
  variant_type TEXT,      -- stores the type of variant (e.g. "Color", "Size", "Material")
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'simple';
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS regular_price DECIMAL(10,2);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view non-hidden products" ON products;
CREATE POLICY "Public can view non-hidden products"
  ON products FOR SELECT
  USING (availability != 'hidden');

DROP POLICY IF EXISTS "Service role has full access" ON products;
CREATE POLICY "Service role has full access"
  ON products FOR ALL
  USING (auth.role() = 'service_role');
