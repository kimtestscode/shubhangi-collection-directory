-- Shubhangi Collection - Order Shipping Master
-- Run this in Supabase > SQL Editor. Non-destructive migration.
-- Preserves all existing records and adds fields for customer details, courier partners, and tracking.

CREATE TABLE IF NOT EXISTS shipping_master (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT UNIQUE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'picked_up' | 'dispatched'
  customer_name    TEXT,
  customer_mobile  TEXT,
  customer_address TEXT,
  customer_city    TEXT,
  customer_pincode TEXT,
  printed_at       TIMESTAMPTZ DEFAULT NOW(),
  shipped_at       TIMESTAMPTZ,                         -- moment of pickup scan
  handed_to        TEXT,                                -- delivery person / courier name
  courier_partner  TEXT,                                -- 'shree_maruti' | 'anjani' | 'india_post' | 'other'
  tracking_number  TEXT,
  tracking_url     TEXT,
  docket_photo_url TEXT,
  whatsapp_sent    BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- In case table already exists from earlier setup, add missing columns safely:
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS customer_city TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS customer_pincode TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE shipping_master ALTER COLUMN shipped_at DROP NOT NULL;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS courier_partner TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS docket_photo_url TEXT;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false;
ALTER TABLE shipping_master ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- Indices for rapid querying & filtering
CREATE INDEX IF NOT EXISTS shipping_master_order_number_idx ON shipping_master (order_number);
CREATE INDEX IF NOT EXISTS shipping_master_status_idx ON shipping_master (status);
CREATE INDEX IF NOT EXISTS shipping_master_shipped_at_idx ON shipping_master (shipped_at DESC);
CREATE INDEX IF NOT EXISTS shipping_master_printed_at_idx ON shipping_master (printed_at DESC);
CREATE INDEX IF NOT EXISTS shipping_master_created_at_idx ON shipping_master (created_at DESC);

-- Row Level Security
ALTER TABLE shipping_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access" ON shipping_master;
CREATE POLICY "Service role has full access"
  ON shipping_master FOR ALL
  USING (auth.role() = 'service_role');
