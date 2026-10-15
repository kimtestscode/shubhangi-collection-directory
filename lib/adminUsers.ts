import { createAdminClient } from './supabase';

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'support' | 'courier_partner';

export type UserType = 'MANAGER' | 'EMPLOYEE' | 'PARTNER' | 'ADMIN';
export type UserChannel = 'Web' | 'Mobile' | 'Web + Mobile';

export interface ActionRights {
  view: boolean;
  add: boolean;
  change: boolean;
  delete: boolean;
  download: boolean;
}

export type PermissionSectionKey =
  | 'products'
  | 'categories'
  | 'address_printer'
  | 'shipping_printer'
  | 'shipping_master'
  | 'pending_dispatch'
  | 'hub_dispatch'
  | 'backdate_pickup'
  | 'costs_spend'
  | 'whatsapp_tracking'
  | 'courier_portal'
  | 'manage_users';

export interface AppPermissionGroup {
  id: string;
  nameEn: string;
  nameMr: string;
  sections: {
    key: PermissionSectionKey;
    labelEn: string;
    labelMr: string;
    descriptionEn: string;
  }[];
}

export const PERMISSION_GROUPS: AppPermissionGroup[] = [
  {
    id: 'catalog_app',
    nameEn: 'Booking & Catalog App',
    nameMr: 'बुकिंग व प्रॉडक्ट कॅटलॉग',
    sections: [
      { key: 'products', labelEn: 'Products Catalog', labelMr: 'उत्पादनांची यादी', descriptionEn: 'View, add, edit, or delete store products' },
      { key: 'categories', labelEn: 'Categories', labelMr: 'कॅटेगरी', descriptionEn: 'Manage store categories and groupings' },
    ],
  },
  {
    id: 'printing_app',
    nameEn: 'Printing & Label App',
    nameMr: 'प्रिंटिंग व लेबलिंग',
    sections: [
      { key: 'address_printer', labelEn: 'Address Label Printer', labelMr: 'पत्ता प्रिंटर', descriptionEn: 'Single & bulk plain text label printing' },
      { key: 'shipping_printer', labelEn: 'Address Print + QR (Beta)', labelMr: 'पत्ता प्रिंट + QR', descriptionEn: 'Batch WhatsApp parser with QR barcodes' },
    ],
  },
  {
    id: 'shipping_app',
    nameEn: 'Shipping & Manifest App',
    nameMr: 'शिपिंग व मॅनिफेस्ट',
    sections: [
      { key: 'shipping_master', labelEn: 'Shipping Master', labelMr: 'शिपिंग मास्टर', descriptionEn: 'Complete parcels log, filters, CSV export, and address management' },
      { key: 'pending_dispatch', labelEn: 'Pending Dispatch / Pickup Scan', labelMr: 'पिकअप स्कॅनिंग', descriptionEn: 'Scan parcel barcodes to register courier handovers' },
      { key: 'hub_dispatch', labelEn: 'Hub Dispatch / Docket Assign', labelMr: 'हब डॉकेट नोंद', descriptionEn: 'Assign courier partner and consignment numbers' },
      { key: 'backdate_pickup', labelEn: 'Backdate Pickup Dates', labelMr: 'मागील तारखेची पिकअप नोंद', descriptionEn: 'Permission to select past dates for pickup scanning' },
    ],
  },
  {
    id: 'commercials_app',
    nameEn: 'Commercials & Support App',
    nameMr: 'खर्च व कस्टमर सपोर्ट',
    sections: [
      { key: 'costs_spend', labelEn: 'Commercial Costs & Spend (₹)', labelMr: 'कुरिअर खर्च व जमाखर्च', descriptionEn: 'View per-parcel courier charges and spend analytics' },
      { key: 'whatsapp_tracking', labelEn: 'WhatsApp Tracking Alerts', labelMr: 'व्हॉट्सॲप ट्रॅकिंग', descriptionEn: '1-click customer WhatsApp tracking notifications' },
    ],
  },
  {
    id: 'mobile_app',
    nameEn: 'Courier Delivery Partner Portal',
    nameMr: 'डिलिव्हरी पार्टनर मोबाईल पोर्टल',
    sections: [
      { key: 'courier_portal', labelEn: 'Mobile Hub Handover (/courier)', labelMr: 'मोबाईल हब पोर्टल', descriptionEn: 'Dedicated mobile screen for delivery partners' },
    ],
  },
  {
    id: 'security_app',
    nameEn: 'Security & Access App',
    nameMr: 'सुरक्षा व वापरकर्ते',
    sections: [
      { key: 'manage_users', labelEn: 'Users & Permissions', labelMr: 'वापरकर्ते व परवानग्या', descriptionEn: 'Create logins, edit roles, assign permissions' },
    ],
  },
];

export interface UserPermissions {
  // Legacy boolean flags for backwards compatibility
  manage_products: boolean;
  view_products: boolean;
  address_printer: boolean;
  shipping_master: boolean;
  backdate_pickup: boolean;
  view_shipping_spend: boolean;
  send_tracking: boolean;
  courier_portal: boolean;
  manage_users: boolean;
  // Granular ActionRights matrix
  matrix?: Partial<Record<PermissionSectionKey, ActionRights>>;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  user_type?: UserType;
  department?: string | null;
  designation?: string | null;
  home_branch?: string | null;
  channel?: UserChannel;
  password: string;
  pin?: string | null;
  is_active: boolean;
  permissions: UserPermissions;
  notes?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export function defaultRights(enabled = false): ActionRights {
  return {
    view: enabled,
    add: enabled,
    change: enabled,
    delete: enabled,
    download: enabled,
  };
}

export function customRights(view = true, add = false, change = false, del = false, download = false): ActionRights {
  return { view, add, change, delete: del, download };
}

export const ROLE_CONFIG: Record<
  UserRole,
  {
    nameEn: string;
    nameMr: string;
    user_type: UserType;
    department: string;
    designation: string;
    home_branch: string;
    channel: UserChannel;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    descriptionEn: string;
    descriptionMr: string;
    defaultPermissions: UserPermissions;
  }
> = {
  super_admin: {
    nameEn: 'Super Admin',
    nameMr: 'सुपर ॲडमीन (मालक)',
    user_type: 'ADMIN',
    department: 'Administration',
    designation: 'Store Owner',
    home_branch: 'Solapur Main Branch',
    channel: 'Web + Mobile',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    descriptionEn: 'Full unconstrained access to all modules, financial data, and security controls.',
    descriptionMr: 'सर्व मॉड्यूल्स, हिशोब व सिक्युरिटीचे संपूर्ण अधिकार.',
    defaultPermissions: {
      manage_products: true,
      view_products: true,
      address_printer: true,
      shipping_master: true,
      backdate_pickup: true,
      view_shipping_spend: true,
      send_tracking: true,
      courier_portal: true,
      manage_users: true,
      matrix: {
        products: defaultRights(true),
        categories: defaultRights(true),
        address_printer: defaultRights(true),
        shipping_printer: defaultRights(true),
        shipping_master: defaultRights(true),
        pending_dispatch: defaultRights(true),
        hub_dispatch: defaultRights(true),
        backdate_pickup: defaultRights(true),
        costs_spend: defaultRights(true),
        whatsapp_tracking: defaultRights(true),
        courier_portal: defaultRights(true),
        manage_users: defaultRights(true),
      },
    },
  },
  admin: {
    nameEn: 'Store Admin',
    nameMr: 'स्टोअर ॲडमीन',
    user_type: 'MANAGER',
    department: 'Store Management',
    designation: 'Store Manager',
    home_branch: 'Solapur Main Branch',
    channel: 'Web',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    descriptionEn: 'Store management, product editing, printing, shipping, and customer operations.',
    descriptionMr: 'दुकान व्यवस्थापन, उत्पादने, प्रिंटिंग व शिपिंगचे अधिकार.',
    defaultPermissions: {
      manage_products: true,
      view_products: true,
      address_printer: true,
      shipping_master: true,
      backdate_pickup: true,
      view_shipping_spend: true,
      send_tracking: true,
      courier_portal: true,
      manage_users: false,
      matrix: {
        products: defaultRights(true),
        categories: defaultRights(true),
        address_printer: defaultRights(true),
        shipping_printer: defaultRights(true),
        shipping_master: defaultRights(true),
        pending_dispatch: defaultRights(true),
        hub_dispatch: defaultRights(true),
        backdate_pickup: defaultRights(true),
        costs_spend: defaultRights(true),
        whatsapp_tracking: defaultRights(true),
        courier_portal: defaultRights(true),
        manage_users: customRights(true, false, false, false, false),
      },
    },
  },
  staff: {
    nameEn: 'Packing & Dispatch Staff',
    nameMr: 'पॅकिंग व डिस्पॅच स्टाफ',
    user_type: 'EMPLOYEE',
    department: 'Operations / Dispatch',
    designation: 'Packing & Dispatch Staff',
    home_branch: 'Solapur Main Warehouse',
    channel: 'Web',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    descriptionEn: 'Label printing, scanning order pickups, and recording handovers (including back-dates). Restricted from catalog and user management.',
    descriptionMr: 'लेबल प्रिंटिंग, पार्सल पिकअप स्कॅनिंग आणि मागील तारखेचे पिकअप नोंदवणे.',
    defaultPermissions: {
      manage_products: false,
      view_products: false,
      address_printer: true,
      shipping_master: true,
      backdate_pickup: true,
      view_shipping_spend: false,
      send_tracking: true,
      courier_portal: false,
      manage_users: false,
      matrix: {
        products: customRights(false, false, false, false, false),
        categories: customRights(false, false, false, false, false),
        address_printer: customRights(true, true, true, false, true),
        shipping_printer: customRights(true, true, true, false, true),
        shipping_master: customRights(true, true, true, false, true),
        pending_dispatch: customRights(true, true, true, false, true),
        hub_dispatch: customRights(true, true, true, false, false),
        backdate_pickup: customRights(true, true, true, false, false),
        costs_spend: customRights(false, false, false, false, false),
        whatsapp_tracking: customRights(true, true, true, false, false),
        courier_portal: customRights(false, false, false, false, false),
        manage_users: customRights(false, false, false, false, false),
      },
    },
  },
  support: {
    nameEn: 'Customer Care & Chat Support',
    nameMr: 'कस्टमर केअर व चॅट सपोर्ट',
    user_type: 'EMPLOYEE',
    department: 'Customer Support',
    designation: 'Customer Care Executive',
    home_branch: 'Solapur Main Branch',
    channel: 'Web + Mobile',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    descriptionEn: 'Order lookups, customer address verification, and sending WhatsApp tracking links. No access to products or user management.',
    descriptionMr: 'ऑर्डर तपासणे व ग्राहकांना व्हॉट्सॲप ट्रॅकिंग पाठवणे.',
    defaultPermissions: {
      manage_products: false,
      view_products: true,
      address_printer: true,
      shipping_master: true,
      backdate_pickup: false,
      view_shipping_spend: false,
      send_tracking: true,
      courier_portal: false,
      manage_users: false,
      matrix: {
        products: customRights(true, false, false, false, false),
        categories: customRights(true, false, false, false, false),
        address_printer: customRights(true, false, false, false, true),
        shipping_printer: customRights(true, false, false, false, true),
        shipping_master: customRights(true, false, false, false, true),
        pending_dispatch: customRights(false, false, false, false, false),
        hub_dispatch: customRights(false, false, false, false, false),
        backdate_pickup: customRights(false, false, false, false, false),
        costs_spend: customRights(false, false, false, false, false),
        whatsapp_tracking: customRights(true, true, true, false, false),
        courier_portal: customRights(false, false, false, false, false),
        manage_users: customRights(false, false, false, false, false),
      },
    },
  },
  courier_partner: {
    nameEn: 'Courier Delivery Partner',
    nameMr: 'डिलिव्हरी पार्टनर',
    user_type: 'PARTNER',
    department: 'Delivery / Logistics',
    designation: 'Courier Partner',
    home_branch: 'Solapur Hub',
    channel: 'Mobile',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    descriptionEn: 'Dedicated mobile hub access (/courier) to record hub handover, dockets & parcel costs. Strictly isolated from the main admin panel.',
    descriptionMr: 'फक्त /courier मोबाईल पोर्टलद्वारे डॉकेट व खर्चाची नोंद.',
    defaultPermissions: {
      manage_products: false,
      view_products: false,
      address_printer: false,
      shipping_master: false,
      backdate_pickup: false,
      view_shipping_spend: false,
      send_tracking: false,
      courier_portal: true,
      manage_users: false,
      matrix: {
        products: customRights(false, false, false, false, false),
        categories: customRights(false, false, false, false, false),
        address_printer: customRights(false, false, false, false, false),
        shipping_printer: customRights(false, false, false, false, false),
        shipping_master: customRights(false, false, false, false, false),
        pending_dispatch: customRights(false, false, false, false, false),
        hub_dispatch: customRights(false, false, false, false, false),
        backdate_pickup: customRights(false, false, false, false, false),
        costs_spend: customRights(false, false, false, false, false),
        whatsapp_tracking: customRights(false, false, false, false, false),
        courier_portal: customRights(true, true, true, false, true),
        manage_users: customRights(false, false, false, false, false),
      },
    },
  },
};

/**
 * Resolves permissions and guarantees both legacy boolean flags and action matrix.
 */
export function normalizeUserPermissions(raw: any, role: UserRole): UserPermissions {
  const defaults = ROLE_CONFIG[role]?.defaultPermissions || ROLE_CONFIG.staff.defaultPermissions;
  if (!raw || typeof raw !== 'object') return defaults;

  const legacy: UserPermissions = {
    manage_products: typeof raw.manage_products === 'boolean' ? raw.manage_products : defaults.manage_products,
    view_products: typeof raw.view_products === 'boolean' ? raw.view_products : defaults.view_products,
    address_printer: typeof raw.address_printer === 'boolean' ? raw.address_printer : defaults.address_printer,
    shipping_master: typeof raw.shipping_master === 'boolean' ? raw.shipping_master : defaults.shipping_master,
    backdate_pickup: typeof raw.backdate_pickup === 'boolean' ? raw.backdate_pickup : defaults.backdate_pickup,
    view_shipping_spend: typeof raw.view_shipping_spend === 'boolean' ? raw.view_shipping_spend : defaults.view_shipping_spend,
    send_tracking: typeof raw.send_tracking === 'boolean' ? raw.send_tracking : defaults.send_tracking,
    courier_portal: typeof raw.courier_portal === 'boolean' ? raw.courier_portal : defaults.courier_portal,
    manage_users: typeof raw.manage_users === 'boolean' ? raw.manage_users : defaults.manage_users,
    matrix: { ...defaults.matrix },
  };

  if (raw.matrix && typeof raw.matrix === 'object') {
    legacy.matrix = { ...defaults.matrix, ...raw.matrix };
  }

  return legacy;
}

/**
 * Checks if a user has access to a specific section and action.
 */
export function hasRight(
  permissions: UserPermissions | undefined | null,
  section: PermissionSectionKey,
  action: keyof ActionRights = 'view'
): boolean {
  if (!permissions) return false;
  if (permissions.matrix && permissions.matrix[section]) {
    return Boolean(permissions.matrix[section]![action]);
  }
  // Fallback to legacy boolean mapping
  switch (section) {
    case 'products':
      return action === 'view' ? permissions.view_products || permissions.manage_products : permissions.manage_products;
    case 'categories':
      return permissions.manage_products;
    case 'address_printer':
    case 'shipping_printer':
      return permissions.address_printer;
    case 'shipping_master':
    case 'pending_dispatch':
    case 'hub_dispatch':
      return permissions.shipping_master;
    case 'backdate_pickup':
      return permissions.backdate_pickup;
    case 'costs_spend':
      return permissions.view_shipping_spend;
    case 'whatsapp_tracking':
      return permissions.send_tracking;
    case 'courier_portal':
      return permissions.courier_portal;
    case 'manage_users':
      return permissions.manage_users;
    default:
      return false;
  }
}

/**
 * Checks if a user can access a specific application route.
 */
export function hasPageAccess(user: { role: string; permissions?: UserPermissions } | null, pathname: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  const perms = user.permissions;

  // Courier partner can ONLY access /courier
  if (user.role === 'courier_partner') {
    return pathname.startsWith('/courier');
  }

  // /admin root catalog
  if (pathname === '/admin' || pathname === '/admin/products' || pathname.startsWith('/admin/products/')) {
    return hasRight(perms, 'products', 'view') || Boolean(perms?.view_products || perms?.manage_products);
  }

  // /admin/categories
  if (pathname.startsWith('/admin/categories')) {
    return hasRight(perms, 'categories', 'view') || Boolean(perms?.manage_products);
  }

  // /admin/address-printer
  if (pathname.startsWith('/admin/address-printer')) {
    return hasRight(perms, 'address_printer', 'view') || Boolean(perms?.address_printer);
  }

  // /admin/shipping-printer
  if (pathname.startsWith('/admin/shipping-printer')) {
    return hasRight(perms, 'shipping_printer', 'view') || Boolean(perms?.address_printer);
  }

  // /admin/shipping-master
  if (pathname.startsWith('/admin/shipping-master')) {
    return hasRight(perms, 'shipping_master', 'view') || Boolean(perms?.shipping_master);
  }

  // /admin/users
  if (pathname.startsWith('/admin/users')) {
    return hasRight(perms, 'manage_users', 'view') || Boolean(perms?.manage_users);
  }

  // Help is accessible to all logged-in staff
  if (pathname.startsWith('/admin/help')) {
    return true;
  }

  return true;
}

/**
 * Returns optimal landing page according to user's assigned role.
 */
export function getDefaultRedirect(role: string): string {
  switch (role) {
    case 'courier_partner':
      return '/courier';
    case 'staff':
      return '/admin/shipping-master';
    case 'support':
      return '/admin/shipping-master';
    case 'admin':
    case 'super_admin':
    default:
      return '/admin';
  }
}

// In-memory fallback if Supabase table is not yet run by user
const INITIAL_FALLBACK_USERS: AdminUser[] = [
  {
    id: 'usr_super_admin',
    name: 'Shubhangi (Store Owner)',
    username: 'admin',
    email: 'admin@shubhangicollection.in',
    phone: '9842171815',
    role: 'super_admin',
    user_type: 'ADMIN',
    department: 'Administration',
    designation: 'Store Owner',
    home_branch: 'Solapur Main Branch',
    channel: 'Web + Mobile',
    password: process.env.ADMIN_SECRET || 'ShubhangiAdmin2026!',
    pin: '4792',
    is_active: true,
    permissions: ROLE_CONFIG.super_admin.defaultPermissions,
    notes: 'Super Admin master account with full system rights.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_dispatch_staff',
    name: 'Aaradhya (Packing Staff)',
    username: 'dispatch_staff',
    email: 'dispatch@shubhangicollection.in',
    phone: '9850486591',
    role: 'staff',
    user_type: 'EMPLOYEE',
    department: 'Operations / Dispatch',
    designation: 'Packing & Dispatch Staff',
    home_branch: 'Solapur Main Warehouse',
    channel: 'Web',
    password: 'Dispatch2026!',
    pin: '2026',
    is_active: true,
    permissions: ROLE_CONFIG.staff.defaultPermissions,
    notes: 'Warehouse staff handling address printing, QR labels, and pickup scans.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_support_team',
    name: 'Aanya Rao (Customer Care)',
    username: 'support_team',
    email: 'support@shubhangicollection.in',
    phone: '9833045260',
    role: 'support',
    user_type: 'EMPLOYEE',
    department: 'Customer Support',
    designation: 'Customer Care Executive',
    home_branch: 'Solapur Main Branch',
    channel: 'Web + Mobile',
    password: 'Support2026!',
    pin: '1122',
    is_active: true,
    permissions: ROLE_CONFIG.support.defaultPermissions,
    notes: 'Staff handling chat inquiries and 1-click WhatsApp customer tracking.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_courier_partner',
    name: 'Maruti Courier Partner',
    username: 'courier_partner',
    email: 'courier@shubhangicollection.in',
    phone: '9846770841',
    role: 'courier_partner',
    user_type: 'PARTNER',
    department: 'Delivery / Logistics',
    designation: 'Courier Partner',
    home_branch: 'Solapur Hub',
    channel: 'Mobile',
    password: 'Courier2026!',
    pin: process.env.COURIER_PIN || '4792',
    is_active: true,
    permissions: ROLE_CONFIG.courier_partner.defaultPermissions,
    notes: 'Delivery partner logging dockets, photos, and commercials via /courier mobile portal.',
    created_at: new Date().toISOString(),
  },
];

let fallbackUsersStore = [...INITIAL_FALLBACK_USERS];

export async function getAdminUsers(): Promise<{ users: AdminUser[]; isTablePresent: boolean }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { users: fallbackUsersStore, isTablePresent: false };
    }

    if (!data || data.length === 0) {
      return { users: fallbackUsersStore, isTablePresent: true };
    }

    const formatted: AdminUser[] = data.map((row: any) => {
      const role = (row.role as UserRole) || 'staff';
      const roleDefaults = ROLE_CONFIG[role] || ROLE_CONFIG.staff;
      return {
        ...row,
        user_type: row.user_type || roleDefaults.user_type,
        department: row.department || roleDefaults.department,
        designation: row.designation || roleDefaults.designation,
        home_branch: row.home_branch || roleDefaults.home_branch,
        channel: row.channel || roleDefaults.channel,
        permissions: normalizeUserPermissions(row.permissions, role),
      };
    });

    return { users: formatted, isTablePresent: true };
  } catch {
    return { users: fallbackUsersStore, isTablePresent: false };
  }
}

export async function createAdminUser(userData: Partial<AdminUser>): Promise<AdminUser> {
  const role = (userData.role as UserRole) || 'staff';
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.staff;
  const permissions = normalizeUserPermissions(userData.permissions, role);

  const newUser: AdminUser = {
    id: userData.id || `usr_${Date.now()}`,
    name: userData.name || 'New Staff Member',
    username: (userData.username || `user_${Date.now()}`).trim().toLowerCase(),
    email: userData.email?.trim() || null,
    phone: userData.phone?.trim() || null,
    role,
    user_type: userData.user_type || roleConfig.user_type,
    department: userData.department || roleConfig.department,
    designation: userData.designation || roleConfig.designation,
    home_branch: userData.home_branch || roleConfig.home_branch,
    channel: userData.channel || roleConfig.channel,
    password: userData.password || 'Welcome@2026',
    pin: userData.pin?.trim() || null,
    is_active: userData.is_active ?? true,
    permissions,
    notes: userData.notes || null,
    last_login_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        user_type: newUser.user_type,
        department: newUser.department,
        designation: newUser.designation,
        home_branch: newUser.home_branch,
        channel: newUser.channel,
        password: newUser.password,
        pin: newUser.pin,
        is_active: newUser.is_active,
        permissions: newUser.permissions,
        notes: newUser.notes,
      })
      .select()
      .single();

    if (error) {
      // If table doesn't have extended columns, retry with base columns
      const fallbackInsert = await supabase
        .from('admin_users')
        .insert({
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          password: newUser.password,
          pin: newUser.pin,
          is_active: newUser.is_active,
          permissions: {
            ...newUser.permissions,
            _meta: {
              user_type: newUser.user_type,
              department: newUser.department,
              designation: newUser.designation,
              home_branch: newUser.home_branch,
              channel: newUser.channel,
            },
          },
          notes: newUser.notes,
        })
        .select()
        .single();

      if (fallbackInsert.error) {
        fallbackUsersStore = [newUser, ...fallbackUsersStore];
        return newUser;
      }
      return {
        ...fallbackInsert.data,
        user_type: newUser.user_type,
        department: newUser.department,
        designation: newUser.designation,
        home_branch: newUser.home_branch,
        channel: newUser.channel,
        permissions: normalizeUserPermissions(fallbackInsert.data.permissions, role),
      };
    }

    return {
      ...data,
      permissions: normalizeUserPermissions(data.permissions, role),
    };
  } catch {
    fallbackUsersStore = [newUser, ...fallbackUsersStore];
    return newUser;
  }
}

export async function updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
  try {
    const supabase = createAdminClient();
    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof updates.name === 'string') dbPayload.name = updates.name.trim();
    if (typeof updates.username === 'string') dbPayload.username = updates.username.trim().toLowerCase();
    if (typeof updates.email !== 'undefined') dbPayload.email = updates.email ? updates.email.trim() : null;
    if (typeof updates.phone !== 'undefined') dbPayload.phone = updates.phone ? updates.phone.trim() : null;
    if (typeof updates.role === 'string') dbPayload.role = updates.role;
    if (typeof updates.user_type === 'string') dbPayload.user_type = updates.user_type;
    if (typeof updates.department === 'string') dbPayload.department = updates.department;
    if (typeof updates.designation === 'string') dbPayload.designation = updates.designation;
    if (typeof updates.home_branch === 'string') dbPayload.home_branch = updates.home_branch;
    if (typeof updates.channel === 'string') dbPayload.channel = updates.channel;
    if (typeof updates.password === 'string') dbPayload.password = updates.password;
    if (typeof updates.pin !== 'undefined') dbPayload.pin = updates.pin ? updates.pin.trim() : null;
    if (typeof updates.is_active === 'boolean') dbPayload.is_active = updates.is_active;
    if (typeof updates.permissions === 'object') dbPayload.permissions = updates.permissions;
    if (typeof updates.notes !== 'undefined') dbPayload.notes = updates.notes;
    if (typeof updates.last_login_at !== 'undefined') dbPayload.last_login_at = updates.last_login_at;

    const { data, error } = await supabase
      .from('admin_users')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // In case extended columns don't exist in DB, pack them into permissions._meta
      const cleanPayload = { ...dbPayload };
      delete cleanPayload.user_type;
      delete cleanPayload.department;
      delete cleanPayload.designation;
      delete cleanPayload.home_branch;
      delete cleanPayload.channel;

      const { data: retryData } = await supabase
        .from('admin_users')
        .update(cleanPayload)
        .eq('id', id)
        .select()
        .single();

      if (retryData) {
        return {
          ...retryData,
          ...updates,
          permissions: normalizeUserPermissions(retryData.permissions, retryData.role),
        };
      }

      fallbackUsersStore = fallbackUsersStore.map((u) => (u.id === id ? { ...u, ...updates } : u));
      return fallbackUsersStore.find((u) => u.id === id) || null;
    }

    return {
      ...data,
      permissions: normalizeUserPermissions(data.permissions, data.role),
    };
  } catch {
    fallbackUsersStore = fallbackUsersStore.map((u) => (u.id === id ? { ...u, ...updates } : u));
    return fallbackUsersStore.find((u) => u.id === id) || null;
  }
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (!error) {
      fallbackUsersStore = fallbackUsersStore.filter((u) => u.id !== id);
      return true;
    }
  } catch {
    // ignore
  }

  fallbackUsersStore = fallbackUsersStore.filter((u) => u.id !== id);
  return true;
}
