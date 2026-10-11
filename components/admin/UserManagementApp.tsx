'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Package,
  Printer,
  Truck,
  Calendar,
  IndianRupee,
  MessageCircle,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import {
  AdminUser,
  UserRole,
  UserPermissions,
  ROLE_CONFIG,
  PERMISSION_LABELS,
} from '@/lib/adminUsers';

const PERMISSION_ICONS: Record<keyof UserPermissions, React.ComponentType<{ className?: string }>> = {
  manage_products: Package,
  view_products: Package,
  address_printer: Printer,
  shipping_master: Truck,
  backdate_pickup: Calendar,
  view_shipping_spend: IndianRupee,
  send_tracking: MessageCircle,
  courier_portal: Smartphone,
  manage_users: ShieldCheck,
};

export default function UserManagementApp() {
  const { lang } = useLanguage();
  const isMr = lang === 'mr';
  const tx = (en: string, mr: string) => (isMr ? mr : en);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTablePresent, setIsTablePresent] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewTab, setViewTab] = useState<'list' | 'matrix'>('list');

  // Modals & Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('staff');
  const [formPassword, setFormPassword] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(
    ROLE_CONFIG.staff.defaultPermissions
  );

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users || []);
      setIsTablePresent(data.isTablePresent ?? true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('staff');
    setFormPassword('');
    setFormPin('');
    setFormIsActive(true);
    setFormNotes('');
    setFormPermissions(ROLE_CONFIG.staff.defaultPermissions);
    setIsFormOpen(true);
  };

  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormEmail(u.email || '');
    setFormPhone(u.phone || '');
    setFormRole(u.role);
    setFormPassword(u.password || '');
    setFormPin(u.pin || '');
    setFormIsActive(u.is_active);
    setFormNotes(u.notes || '');
    setFormPermissions({ ...u.permissions });
    setIsFormOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormRole(newRole);
    // When changing role, automatically apply sensible default permissions
    setFormPermissions({ ...ROLE_CONFIG[newRole].defaultPermissions });
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        role: formRole,
        password: formPassword.trim(),
        pin: formPin.trim() || null,
        is_active: formIsActive,
        notes: formNotes.trim() || null,
        permissions: formPermissions,
      };

      if (editingUser) {
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error || 'Failed to update user');
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error || 'Failed to create user');
        setUsers((prev) => [created, ...prev]);
      }

      setIsFormOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error saving user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to toggle status');
      setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error updating user');
    }
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (!window.confirm(tx(`Are you sure you want to delete user "${u.name}" (@${u.username})?`, `तुम्हाला खरोखर युझर "${u.name}" (@${u.username}) हटवायचा आहे का?`))) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error deleting user');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copySqlMigration = () => {
    const sql = `-- Shubhangi Collection - Admin Users & Permissions Master
CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  username     TEXT UNIQUE NOT NULL,
  email        TEXT,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'staff',
  password     TEXT NOT NULL,
  pin          TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  permissions  JSONB NOT NULL DEFAULT '{}',
  notes        TEXT,
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users (username);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON admin_users (role);
CREATE INDEX IF NOT EXISTS admin_users_is_active_idx ON admin_users (is_active);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role has full access" ON admin_users;
CREATE POLICY "Service role has full access" ON admin_users FOR ALL USING (auth.role() = 'service_role');`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q) ?? false;
        const matchesPhone = u.phone?.includes(q) ?? false;
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesPhone) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const admins = users.filter((u) => u.role === 'super_admin' || u.role === 'admin').length;
    const staff = users.filter((u) => u.role === 'staff').length;
    const courier = users.filter((u) => u.role === 'courier_partner').length;
    const support = users.filter((u) => u.role === 'support').length;
    return { total, active, admins, staff, courier, support };
  }, [users]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-border-warm shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
              {tx('Users & Access Control', 'वापरकर्ते आणि ॲक्सेस परवानग्या')}
            </h1>
            <p className="text-xs text-charcoal-light mt-0.5">
              {tx(
                'Manage staff logins, assign roles, configure passwords, and control granular feature permissions.',
                'स्टाफचे लॉगिन व्यवस्थापन करा, पासवर्ड/पिन सेट करा आणि विशिष्ट फिचर्सच्या परवानग्या नियंत्रित करा.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border-warm text-charcoal-light hover:text-charcoal hover:bg-ivory transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal text-white hover:bg-charcoal/90 text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-gold" />
            <span>{tx('+ Add New User', '+ नवीन युझर जोडा')}</span>
          </button>
        </div>
      </div>

      {/* Supabase migration alert banner (if table not present yet) */}
      {!isTablePresent && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                {tx(
                  'Cloud Persistence Notice: admin_users table can be synced to Supabase',
                  'क्लाउड डेटाबेस सूचना: admin_users टेबल Supabase मध्ये ॲड करू शकता'
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={copySqlMigration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-2xs"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? tx('Copied SQL!', 'SQL कॉपी झाली!') : tx('Copy SQL', 'SQL कॉपी करा')}</span>
            </button>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {tx(
              'Your user and permission controls are currently working seamlessly with local preloaded profiles. To permanently store custom users in Supabase, copy the script from supabase/admin_users.sql and run it in Supabase > SQL Editor.',
              'तुमचे युझर व परमिशन कंट्रोल्स सध्या चालू आहेत. Supabase मध्ये कायमस्वरूपी सेव्ह करण्यासाठी supabase/admin_users.sql मधील स्क्रिप्ट Supabase > SQL Editor मध्ये Run करा.'
            )}
          </p>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-xs">
          <div className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wider">
            {tx('Total Users', 'एकूण युझर्स')}
          </div>
          <div className="text-2xl font-bold font-serif text-charcoal mt-1">{stats.total}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            {tx('Active Accounts', 'सक्रिय खाती')}
          </div>
          <div className="text-2xl font-bold font-serif text-emerald-800 mt-1">{stats.active}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-xs">
          <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
            {tx('Admins', 'ॲडमन्स')}
          </div>
          <div className="text-2xl font-bold font-serif text-purple-900 mt-1">{stats.admins}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-xs">
          <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            {tx('Dispatch Staff', 'डिस्पॅच स्टाफ')}
          </div>
          <div className="text-2xl font-bold font-serif text-blue-900 mt-1">{stats.staff}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            {tx('Chat Support', 'चॅट सपोर्ट')}
          </div>
          <div className="text-2xl font-bold font-serif text-emerald-900 mt-1">{stats.support}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-xs">
          <div className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">
            {tx('Delivery Courier', 'डिलिव्हरी पार्टनर')}
          </div>
          <div className="text-2xl font-bold font-serif text-orange-900 mt-1">{stats.courier}</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-border-warm shadow-sm overflow-hidden">
        {/* Navigation Tabs (User List vs Permission Matrix) */}
        <div className="border-b border-border-warm bg-ivory/40 p-3 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewTab('list')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                viewTab === 'list'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'bg-white text-charcoal-light hover:text-charcoal border border-border-warm'
              }`}
            >
              {tx('User Accounts & Logins', 'युझर खाती आणि लॉगिन')}
            </button>
            <button
              type="button"
              onClick={() => setViewTab('matrix')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                viewTab === 'matrix'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'bg-white text-charcoal-light hover:text-charcoal border border-border-warm'
              }`}
            >
              {tx('Role Permission Matrix', 'रोल परमिशन मॅट्रिक्स')}
            </button>
          </div>

          {viewTab === 'list' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-charcoal-light/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tx('Search name, username, phone...', 'नाव, युझरनेम किंवा फोन शोधा...')}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border-warm bg-white focus:outline-none focus:border-gold w-48 sm:w-64"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-xl border border-border-warm bg-white text-charcoal focus:outline-none focus:border-gold font-medium"
              >
                <option value="all">{tx('All Roles', 'सर्व रोल्स')}</option>
                <option value="super_admin">{tx('Super Admin', 'सुपर ॲडमीन')}</option>
                <option value="admin">{tx('Store Admin', 'स्टोअर ॲडमीन')}</option>
                <option value="staff">{tx('Dispatch Staff', 'डिस्पॅच स्टाफ')}</option>
                <option value="support">{tx('Chat Support', 'चॅट सपोर्ट')}</option>
                <option value="courier_partner">{tx('Courier Partner', 'कुरिअर पार्टनर')}</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-1.5 px-2.5 text-xs rounded-xl border border-border-warm bg-white text-charcoal focus:outline-none focus:border-gold font-medium"
              >
                <option value="all">{tx('All Status', 'सर्व स्थिती')}</option>
                <option value="active">{tx('Active Only', 'फक्त सक्रिय')}</option>
                <option value="inactive">{tx('Disabled Only', 'फक्त बंद')}</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: User Accounts Table */}
        {viewTab === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory/60 text-charcoal-light uppercase tracking-wider font-semibold border-b border-border-warm text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">{tx('User & Contact', 'युझर व संपर्क')}</th>
                  <th className="px-4 py-3.5">{tx('Role', 'रोल')}</th>
                  <th className="px-4 py-3.5">{tx('Status', 'स्थिती')}</th>
                  <th className="px-4 py-3.5">{tx('Password / PIN', 'पासवर्ड / पिन')}</th>
                  <th className="px-4 py-3.5">{tx('Permissions & Capabilities', 'परवानग्या व अधिकार')}</th>
                  <th className="px-4 py-3.5">{tx('Last Login', 'शेवटचे लॉगिन')}</th>
                  <th className="px-5 py-3.5 text-right">{tx('Actions', 'कृती')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-charcoal-light">
                      <Users className="w-8 h-8 text-charcoal-light/40 mx-auto mb-2" />
                      <p className="text-sm font-semibold">{tx('No users match your filter', 'कोणताही युझर सापडला नाही')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.staff;
                    const isVisiblePw = Boolean(showPasswords[u.id]);
                    const enabledPerms = Object.entries(u.permissions || {})
                      .filter(([, v]) => Boolean(v))
                      .map(([k]) => k as keyof UserPermissions);

                    return (
                      <tr key={u.id} className="hover:bg-ivory/30 transition-colors">
                        {/* Name & Username */}
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-sm text-charcoal">{u.name}</div>
                          <div className="font-mono text-[11px] text-charcoal-light flex items-center gap-1 mt-0.5">
                            <span>@{u.username}</span>
                          </div>
                          {(u.email || u.phone) && (
                            <div className="text-[11px] text-charcoal-light/80 space-y-0.5 mt-1">
                              {u.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-gold" />
                                  <span>{u.email}</span>
                                </div>
                              )}
                              {u.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gold" />
                                  <span>{u.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {u.notes && (
                            <div className="text-[10px] text-charcoal-light/70 italic mt-1 max-w-xs">
                              {u.notes}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleCfg.badgeBg} ${roleCfg.badgeText} ${roleCfg.badgeBorder}`}
                          >
                            {isMr ? roleCfg.nameMr : roleCfg.nameEn}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={u.id === 'usr_super_admin'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                            }`}
                            title={tx('Click to toggle active status', 'स्थिती बदलण्यासाठी क्लिक करा')}
                          >
                            {u.is_active ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{tx('Active', 'सक्रिय')}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-red-600" />
                                <span>{tx('Disabled', 'बंद')}</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Credentials (Password / PIN) */}
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-charcoal bg-ivory-dark/60 px-2 py-0.5 rounded border border-border-warm">
                                {isVisiblePw ? u.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 text-charcoal-light hover:text-charcoal"
                                aria-label="Toggle password visibility"
                              >
                                {isVisiblePw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {u.pin && (
                              <div className="text-[11px] text-charcoal-light font-mono flex items-center gap-1">
                                <Key className="w-3 h-3 text-gold" />
                                <span>PIN: {isVisiblePw ? u.pin : '••••'}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Granted Permissions */}
                        <td className="px-4 py-4 align-top max-w-sm">
                          <div className="flex flex-wrap gap-1">
                            {enabledPerms.map((permKey) => {
                              const pLabel = PERMISSION_LABELS[permKey];
                              const IconComp = PERMISSION_ICONS[permKey] || ShieldCheck;
                              const isBackDate = permKey === 'backdate_pickup';
                              return (
                                <span
                                  key={permKey}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                    isBackDate
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                      : 'bg-ivory-dark/40 text-charcoal border-border-warm'
                                  }`}
                                  title={isMr ? pLabel?.descMr : pLabel?.descEn}
                                >
                                  <IconComp className={`w-3 h-3 ${isBackDate ? 'text-amber-600' : 'text-gold'}`} />
                                  <span>{isMr ? pLabel?.labelMr : pLabel?.labelEn}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Last Login */}
                        <td className="px-4 py-4 align-top text-charcoal-light">
                          {u.last_login_at ? (
                            <span className="text-[11px]">
                              {new Date(u.last_login_at).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="text-[11px] italic text-charcoal-light/50">
                              {tx('Not yet logged in', 'अद्याप लॉगिन नाही')}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-lg border border-border-warm text-charcoal-light hover:text-gold hover:border-gold hover:bg-gold/5 transition-colors"
                              title={tx('Edit user & permissions', 'बदला')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {u.id !== 'usr_super_admin' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg border border-border-warm text-charcoal-light hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                                title={tx('Delete user', 'हटवा')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Role Permission Matrix */}
        {viewTab === 'matrix' && (
          <div className="p-6 overflow-x-auto space-y-4">
            <div className="text-xs text-charcoal-light">
              {tx(
                'This master matrix illustrates default capabilities across roles. Custom permissions can be adjusted per individual account.',
                'हा मॅट्रिक्स विविध रोल्सचे अधिकार दर्शवतो. प्रत्येक खात्यासाठी वैयक्तिक परवानग्या बदलता येतात.'
              )}
            </div>

            <table className="w-full text-left text-xs border border-border-warm rounded-2xl overflow-hidden">
              <thead className="bg-ivory/80 text-charcoal-light uppercase tracking-wider font-semibold border-b border-border-warm text-[11px]">
                <tr>
                  <th className="px-4 py-3">{tx('Permission / Feature', 'परवानगी / फिचर')}</th>
                  {(['super_admin', 'admin', 'staff', 'support', 'courier_partner'] as UserRole[]).map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    return (
                      <th key={r} className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}>
                          {isMr ? cfg.nameMr : cfg.nameEn}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm">
                {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map((permKey) => {
                  const meta = PERMISSION_LABELS[permKey];
                  const Icon = PERMISSION_ICONS[permKey] || ShieldCheck;
                  const isBackDate = permKey === 'backdate_pickup';

                  return (
                    <tr key={permKey} className={isBackDate ? 'bg-amber-50/50' : 'hover:bg-ivory/20'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isBackDate ? 'text-amber-600' : 'text-gold'}`} />
                          <div>
                            <div className="font-semibold text-charcoal">
                              {isMr ? meta.labelMr : meta.labelEn}
                              {isBackDate && (
                                <span className="ml-2 text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-bold">
                                  {tx('Admin & Dispatch', 'ॲडमीन व डिस्पॅच')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-charcoal-light">{isMr ? meta.descMr : meta.descEn}</div>
                          </div>
                        </div>
                      </td>
                      {(['super_admin', 'admin', 'staff', 'support', 'courier_partner'] as UserRole[]).map((r) => {
                        const allowed = ROLE_CONFIG[r].defaultPermissions[permKey];
                        return (
                          <td key={r} className="px-4 py-3 text-center">
                            {allowed ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-border-warm shadow-2xl p-6 sm:p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border-warm pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center text-gold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-charcoal">
                    {editingUser
                      ? tx('Edit User & Permissions', 'युझर व परवानग्या बदला')
                      : tx('Create New User Account', 'नवीन युझर खाते तयार करा')}
                  </h2>
                  <p className="text-xs text-charcoal-light">
                    {tx('Assign login credentials and specific feature controls', 'लॉगिन माहिती व विशिष्ट फिचर्सच्या परवानग्या द्या')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full text-charcoal-light hover:text-charcoal hover:bg-ivory"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1">
                    {tx('Full Name *', 'पूर्ण नाव *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1">
                    {tx('Username (Login handle) *', 'युझरनेम *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. rahul_dispatch"
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs font-mono text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1">
                    {tx('Login Password *', 'पासवर्ड *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter login password"
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs font-mono text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Optional Quick PIN */}
                <div>
                  <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1">
                    {tx('Quick 4-Digit PIN (Optional)', '४-अंकी पिन (पर्यायी)')}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="e.g. 4792"
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs font-mono text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1">
                    {tx('Email Address', 'ईमेल पत्ता')}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1">
                    {tx('Mobile Phone', 'मोबाईल नंबर')}
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="9820012345"
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1.5">
                  {tx('Role Category & Default Profile', 'रोल कॅटेगरी')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['super_admin', 'admin', 'staff', 'support', 'courier_partner'] as UserRole[]).map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    const isSelected = formRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/10 text-charcoal shadow-xs'
                            : 'border-border-warm bg-white hover:bg-ivory/40 text-charcoal-light'
                        }`}
                      >
                        <div className="font-bold text-xs text-charcoal">{isMr ? cfg.nameMr : cfg.nameEn}</div>
                        <div className="text-[10px] text-charcoal-light mt-0.5 line-clamp-2">
                          {isMr ? cfg.descriptionMr : cfg.descriptionEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1.5">
                  {tx('Granular Permissions for this User', 'या युझरसाठी तपशीलवार परवानग्या')}
                </label>
                <div className="border border-border-warm rounded-2xl p-3 bg-ivory/20 max-h-56 overflow-y-auto space-y-2">
                  {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map((permKey) => {
                    const pMeta = PERMISSION_LABELS[permKey];
                    const isChecked = Boolean(formPermissions[permKey]);
                    const Icon = PERMISSION_ICONS[permKey] || ShieldCheck;
                    const isBackDate = permKey === 'backdate_pickup';

                    return (
                      <label
                        key={permKey}
                        className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
                          isChecked ? (isBackDate ? 'bg-amber-100/60 border border-amber-300' : 'bg-white border border-border-warm') : 'hover:bg-ivory/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(permKey)}
                          className="mt-0.5 rounded text-gold focus:ring-gold"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal">
                            <Icon className={`w-3.5 h-3.5 ${isBackDate ? 'text-amber-600' : 'text-gold'}`} />
                            <span>{isMr ? pMeta.labelMr : pMeta.labelEn}</span>
                            {isBackDate && (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-200/80 px-1 rounded">
                                {tx('Back-date Pickups', 'मागील तारीख')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-charcoal-light mt-0.5">
                            {isMr ? pMeta.descMr : pMeta.descEn}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-gold focus:ring-gold"
                  />
                  <span className="text-xs font-semibold text-charcoal">
                    {tx('Account is Active & Allowed to Sign In', 'खाते सक्रिय आहे व लॉगिन करू शकते')}
                  </span>
                </label>

                <div>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={tx('Optional notes / memo', 'पर्यायी टीप किंवा संदर्भ')}
                    className="w-full border border-border-warm rounded-xl px-3 py-1.5 text-xs text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-warm">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-light hover:bg-ivory"
                >
                  {tx('Cancel', 'रद्द करा')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-40 shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingUser ? tx('Save Changes', 'बदल सेव्ह करा') : tx('Create User', 'युझर तयार करा')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
