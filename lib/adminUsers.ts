import { createAdminClient } from './supabase';

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'support' | 'courier_partner';

export interface UserPermissions {
  manage_products: boolean;
  view_products: boolean;
  address_printer: boolean;
  shipping_master: boolean;
  backdate_pickup: boolean;
  view_shipping_spend: boolean;
  send_tracking: boolean;
  courier_portal: boolean;
  manage_users: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  password: string;
  pin?: string | null;
  is_active: boolean;
  permissions: UserPermissions;
  notes?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export const PERMISSION_LABELS: Record<keyof UserPermissions, { labelEn: string; labelMr: string; descEn: string; descMr: string; category: string }> = {
  manage_products: {
    labelEn: 'Manage Products & Categories',
    labelMr: 'उत्पादने व कॅटेगरी व्यवस्थापन',
    descEn: 'Add, edit, change pricing and delete store products and categories',
    descMr: 'उत्पादने व कॅटेगरी जोडणे, बदलणे व हटवणे',
    category: 'Catalog',
  },
  view_products: {
    labelEn: 'View Products Catalog',
    labelMr: 'उत्पादने पाहणे',
    descEn: 'Browse and inspect product catalogue without edit rights',
    descMr: 'उत्पादनांची यादी पाहणे',
    category: 'Catalog',
  },
  address_printer: {
    labelEn: 'Address Label Printer',
    labelMr: 'पत्ता लेबल प्रिंटर',
    descEn: 'Parse raw text addresses and print bulk PDF shipping labels with QR',
    descMr: 'पत्ते पार्स करून PDF लेबल्स प्रिंट करणे',
    category: 'Printing',
  },
  shipping_master: {
    labelEn: 'Shipping Master Dashboard',
    labelMr: 'शिपिंग मास्टर डॅशबोर्ड',
    descEn: 'Access shipping master, scan orders, and track dispatch status',
    descMr: 'पार्सल स्कॅन करणे व डिस्पॅच स्थिती ट्रॅक करणे',
    category: 'Shipping',
  },
  backdate_pickup: {
    labelEn: 'Back-date Pickup Scans',
    labelMr: 'मागील तारखेचा पिकअप नोंदवणे',
    descEn: 'Permission to select and record parcel pickups on back dates instead of only today',
    descMr: 'चालू तारखेव्यतिरिक्त काल किंवा मागील तारखेची पिकअप नोंद करण्याची परवानगी',
    category: 'Shipping',
  },
  view_shipping_spend: {
    labelEn: 'View Commercial Spend & Costs',
    labelMr: 'कुरिअर खर्च व जमाखर्च पाहणे',
    descEn: 'View per-parcel courier charges (₹) and aggregate spend summaries',
    descMr: 'प्रत्येक पार्सलचा कुरिअर खर्च व एकूण खर्च आकडेवारी पाहणे',
    category: 'Finance',
  },
  send_tracking: {
    labelEn: 'Send WhatsApp Tracking',
    labelMr: 'व्हॉट्सॲप ट्रॅकिंग पाठवणे',
    descEn: '1-click WhatsApp message triggers with tracking URLs and transit estimates',
    descMr: 'ग्राहकांना १-क्लिक व्हॉट्सॲप ट्रॅकिंग मेसेज पाठवणे',
    category: 'Customer',
  },
  courier_portal: {
    labelEn: 'Courier Partner Mobile Portal',
    labelMr: 'डिलिव्हरी पार्टनर मोबाईल पोर्टल',
    descEn: 'Access /courier portal to log hub dispatches, docket numbers, and photos',
    descMr: '/courier पोर्टलवर जाऊन हब डिस्पॅच, डॉकेट नंबर व फोटो अपलोड करणे',
    category: 'Mobile',
  },
  manage_users: {
    labelEn: 'Manage Users & Permissions',
    labelMr: 'वापरकर्ते व परवानग्या व्यवस्थापन',
    descEn: 'Create logins, edit roles, change passwords/PINs, and configure permissions',
    descMr: 'नवीन लॉगिन बनवणे, पासवर्ड/पिन बदलणे व परवानग्या सेट करणे',
    category: 'Security',
  },
};

export const ROLE_CONFIG: Record<
  UserRole,
  {
    nameEn: string;
    nameMr: string;
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
    },
  },
  admin: {
    nameEn: 'Store Admin',
    nameMr: 'स्टोअर ॲडमीन',
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
    },
  },
  staff: {
    nameEn: 'Packing & Dispatch Staff',
    nameMr: 'पॅकिंग व डिस्पॅच स्टाफ',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    descriptionEn: 'Label printing, scanning order pickups, and recording handovers (including back-dates).',
    descriptionMr: 'लेबल प्रिंटिंग, पार्सल पिकअप स्कॅनिंग आणि मागील तारखेचे पिकअप नोंदवणे.',
    defaultPermissions: {
      manage_products: false,
      view_products: true,
      address_printer: true,
      shipping_master: true,
      backdate_pickup: true,
      view_shipping_spend: false,
      send_tracking: true,
      courier_portal: false,
      manage_users: false,
    },
  },
  support: {
    nameEn: 'Customer Care & Chat Support',
    nameMr: 'कस्टमर केअर व चॅट सपोर्ट',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    descriptionEn: 'Order lookups, customer mobile verification, and sending WhatsApp tracking links.',
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
    },
  },
  courier_partner: {
    nameEn: 'Courier / Delivery Partner',
    nameMr: 'डिलिव्हरी पार्टनर',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    descriptionEn: 'Dedicated mobile hub access (/courier) to record hub handover, dockets & parcel costs.',
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
    },
  },
};

// In-memory fallback if Supabase table is not yet run by user
const INITIAL_FALLBACK_USERS: AdminUser[] = [
  {
    id: 'usr_super_admin',
    name: 'Shubhangi (Store Owner)',
    username: 'admin',
    email: 'contact@shubhangicollection.com',
    phone: '9820000000',
    role: 'super_admin',
    password: process.env.ADMIN_SECRET || 'ShubhangiAdmin2026!',
    pin: '4792',
    is_active: true,
    permissions: ROLE_CONFIG.super_admin.defaultPermissions,
    notes: 'Primary Super Admin account with unrestricted access.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_dispatch_staff',
    name: 'Packing & Dispatch Staff',
    username: 'dispatch_staff',
    email: 'dispatch@shubhangicollection.com',
    phone: null,
    role: 'staff',
    password: 'Dispatch2026!',
    pin: '2026',
    is_active: true,
    permissions: ROLE_CONFIG.staff.defaultPermissions,
    notes: 'Warehouse team handling label printing, order QR generation, and pickup back-dates.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_support_team',
    name: 'Customer Care & Chat Support',
    username: 'support_team',
    email: 'support@shubhangicollection.com',
    phone: null,
    role: 'support',
    password: 'Support2026!',
    pin: '1122',
    is_active: true,
    permissions: ROLE_CONFIG.support.defaultPermissions,
    notes: 'Staff handling chat inquiries and 1-click WhatsApp customer tracking.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_courier_partner',
    name: 'Courier Delivery Partner',
    username: 'courier_partner',
    email: null,
    phone: null,
    role: 'courier_partner',
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
      // Table doesn't exist yet (404/PGRST204)
      return { users: fallbackUsersStore, isTablePresent: false };
    }

    if (!data || data.length === 0) {
      // Table exists but empty, return fallback
      return { users: fallbackUsersStore, isTablePresent: true };
    }

    const formatted: AdminUser[] = data.map((row: any) => ({
      ...row,
      permissions: {
        ...ROLE_CONFIG[row.role as UserRole]?.defaultPermissions,
        ...(typeof row.permissions === 'object' ? row.permissions : {}),
      },
    }));

    return { users: formatted, isTablePresent: true };
  } catch {
    return { users: fallbackUsersStore, isTablePresent: false };
  }
}

export async function createAdminUser(userData: Partial<AdminUser>): Promise<AdminUser> {
  const role = (userData.role as UserRole) || 'staff';
  const permissions: UserPermissions = {
    ...ROLE_CONFIG[role].defaultPermissions,
    ...(userData.permissions || {}),
  };

  const newUser: AdminUser = {
    id: userData.id || `usr_${Date.now()}`,
    name: userData.name || 'New Staff Member',
    username: (userData.username || `user_${Date.now()}`).trim().toLowerCase(),
    email: userData.email?.trim() || null,
    phone: userData.phone?.trim() || null,
    role,
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
        password: newUser.password,
        pin: newUser.pin,
        is_active: newUser.is_active,
        permissions: newUser.permissions,
        notes: newUser.notes,
      })
      .select()
      .single();

    if (error) {
      // Fallback
      fallbackUsersStore = [newUser, ...fallbackUsersStore];
      return newUser;
    }

    return {
      ...data,
      permissions: {
        ...ROLE_CONFIG[data.role as UserRole]?.defaultPermissions,
        ...(typeof data.permissions === 'object' ? data.permissions : {}),
      },
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
      fallbackUsersStore = fallbackUsersStore.map((u) => (u.id === id ? { ...u, ...updates } : u));
      return fallbackUsersStore.find((u) => u.id === id) || null;
    }

    return {
      ...data,
      permissions: {
        ...ROLE_CONFIG[data.role as UserRole]?.defaultPermissions,
        ...(typeof data.permissions === 'object' ? data.permissions : {}),
      },
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
