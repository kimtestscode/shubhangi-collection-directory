-- Shubhangi Collection - Admin Users & Permissions Master
-- Run this in Supabase > SQL Editor to store logins, roles, and granular permissions.

CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  username     TEXT UNIQUE NOT NULL,
  email        TEXT,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'staff', -- 'super_admin' | 'admin' | 'staff' | 'support' | 'courier_partner'
  password     TEXT NOT NULL,                -- login password
  pin          TEXT,                         -- optional 4-digit quick PIN (e.g. for courier hub or mobile)
  is_active    BOOLEAN NOT NULL DEFAULT true,
  permissions  JSONB NOT NULL DEFAULT '{}',  -- granular flags e.g. {"manage_products":true, "backdate_pickup":true}
  notes        TEXT,
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid lookup
CREATE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users (username);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON admin_users (role);
CREATE INDEX IF NOT EXISTS admin_users_is_active_idx ON admin_users (is_active);

-- Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access" ON admin_users;
CREATE POLICY "Service role has full access"
  ON admin_users FOR ALL
  USING (auth.role() = 'service_role');

-- Insert initial standard accounts if not already present
INSERT INTO admin_users (name, username, role, password, pin, is_active, permissions, notes)
VALUES
  (
    'Shubhangi (Store Owner)',
    'admin',
    'super_admin',
    'ShubhangiAdmin2026!',
    '4792',
    true,
    '{"manage_products":true, "view_products":true, "address_printer":true, "shipping_master":true, "backdate_pickup":true, "view_shipping_spend":true, "send_tracking":true, "courier_portal":true, "manage_users":true}',
    'Super Admin account with full master rights.'
  ),
  (
    'Packing & Dispatch Staff',
    'dispatch_staff',
    'staff',
    'Dispatch2026!',
    '2026',
    true,
    '{"manage_products":false, "view_products":true, "address_printer":true, "shipping_master":true, "backdate_pickup":true, "view_shipping_spend":false, "send_tracking":true, "courier_portal":false, "manage_users":false}',
    'Warehouse staff handling address printing, QR labels, and pickup scans.'
  ),
  (
    'Customer Care & Support',
    'support_team',
    'support',
    'Support2026!',
    '1122',
    true,
    '{"manage_products":false, "view_products":true, "address_printer":true, "shipping_master":true, "backdate_pickup":false, "view_shipping_spend":false, "send_tracking":true, "courier_portal":false, "manage_users":false}',
    'Chat support team handling customer inquiries and WhatsApp tracking updates.'
  ),
  (
    'Courier Delivery Partner',
    'courier_partner',
    'courier_partner',
    'Courier2026!',
    '4792',
    true,
    '{"manage_products":false, "view_products":false, "address_printer":false, "shipping_master":false, "backdate_pickup":false, "view_shipping_spend":false, "send_tracking":false, "courier_portal":true, "manage_users":false}',
    'Delivery partner for hub dispatch, dockets, photo receipts, and per-parcel commercials.'
  )
ON CONFLICT (username) DO NOTHING;
