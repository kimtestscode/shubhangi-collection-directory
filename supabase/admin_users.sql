-- Shubhangi Collection - Admin Users & Permissions Master
-- Run this in Supabase > SQL Editor to store logins, roles, and granular permissions.

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'staff', -- 'super_admin' | 'admin' | 'staff' | 'support' | 'courier_partner'
  user_type     TEXT DEFAULT 'EMPLOYEE',      -- 'MANAGER' | 'EMPLOYEE' | 'PARTNER' | 'ADMIN'
  department    TEXT DEFAULT 'Operations / Dispatch',
  designation   TEXT DEFAULT 'Packing & Dispatch Staff',
  home_branch   TEXT DEFAULT 'Solapur Main Branch',
  channel       TEXT DEFAULT 'Web',           -- 'Web' | 'Mobile' | 'Web + Mobile'
  password      TEXT NOT NULL,                -- login password
  pin           TEXT,                         -- optional quick PIN (e.g. for mobile hub)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  permissions   JSONB NOT NULL DEFAULT '{}',  -- granular flags & action matrix
  notes         TEXT,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migration in case admin_users table already exists without newer columns
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'EMPLOYEE';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Operations / Dispatch';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Packing & Dispatch Staff';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS home_branch TEXT DEFAULT 'Solapur Main Branch';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'Web';

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
INSERT INTO admin_users (name, username, role, user_type, department, designation, home_branch, channel, email, phone, password, pin, is_active, permissions, notes)
VALUES
  (
    'Shubhangi (Store Owner)',
    'admin',
    'super_admin',
    'ADMIN',
    'Administration',
    'Store Owner',
    'Solapur Main Branch',
    'Web + Mobile',
    'admin@shubhangicollection.in',
    '9842171815',
    'ShubhangiAdmin2026!',
    '4792',
    true,
    '{"manage_products":true, "view_products":true, "address_printer":true, "shipping_master":true, "backdate_pickup":true, "view_shipping_spend":true, "send_tracking":true, "courier_portal":true, "manage_users":true}',
    'Super Admin account with full master rights.'
  ),
  (
    'Aaradhya (Packing Staff)',
    'dispatch_staff',
    'staff',
    'EMPLOYEE',
    'Operations / Dispatch',
    'Packing & Dispatch Staff',
    'Solapur Main Warehouse',
    'Web',
    'dispatch@shubhangicollection.in',
    '9850486591',
    'Dispatch2026!',
    '2026',
    true,
    '{"manage_products":false, "view_products":false, "address_printer":true, "shipping_master":true, "backdate_pickup":true, "view_shipping_spend":false, "send_tracking":true, "courier_portal":false, "manage_users":false}',
    'Warehouse staff handling address printing, QR labels, and pickup scans.'
  ),
  (
    'Aanya Rao (Customer Care)',
    'support_team',
    'support',
    'EMPLOYEE',
    'Customer Support',
    'Customer Care Executive',
    'Solapur Main Branch',
    'Web + Mobile',
    'support@shubhangicollection.in',
    '9833045260',
    'Support2026!',
    '1122',
    true,
    '{"manage_products":false, "view_products":true, "address_printer":true, "shipping_master":true, "backdate_pickup":false, "view_shipping_spend":false, "send_tracking":true, "courier_portal":false, "manage_users":false}',
    'Chat support team handling customer inquiries and WhatsApp tracking updates.'
  ),
  (
    'Maruti Courier Partner',
    'courier_partner',
    'courier_partner',
    'PARTNER',
    'Delivery / Logistics',
    'Courier Partner',
    'Solapur Hub',
    'Mobile',
    'courier@shubhangicollection.in',
    '9846770841',
    'Courier2026!',
    '4792',
    true,
    '{"manage_products":false, "view_products":false, "address_printer":false, "shipping_master":false, "backdate_pickup":false, "view_shipping_spend":false, "send_tracking":false, "courier_portal":true, "manage_users":false}',
    'Delivery partner logging dockets, photos, and commercials via /courier mobile portal.'
  )
ON CONFLICT (username) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  department = EXCLUDED.department,
  designation = EXCLUDED.designation,
  home_branch = EXCLUDED.home_branch,
  channel = EXCLUDED.channel,
  updated_at = NOW();
