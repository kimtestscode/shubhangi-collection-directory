-- Shubhangi Collection - Order Shipping Master
-- Run this once in Supabase > SQL Editor. It does NOT touch the products table.

CREATE TABLE IF NOT EXISTS shipping_master (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  TEXT UNIQUE NOT NULL,          -- one row per order, scanning twice never duplicates
  shipped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- moment of pickup scan (replaces the hand-written date)
  handed_to     TEXT,                          -- optional: delivery person / courier name
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shipping_master_shipped_at_idx ON shipping_master (shipped_at DESC);

-- Private table: only the server (service role) can read/write it.
ALTER TABLE shipping_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access" ON shipping_master;
CREATE POLICY "Service role has full access"
  ON shipping_master FOR ALL
  USING (auth.role() = 'service_role');
