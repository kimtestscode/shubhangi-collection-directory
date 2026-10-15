'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, ShieldCheck, Key, Lock, Mail, Phone,
  CheckCircle2, XCircle, AlertTriangle, Copy, Check, Edit3, Trash2,
  Search, RefreshCw, ExternalLink, Eye, EyeOff, Package, Printer,
  Truck, Calendar, IndianRupee, MessageCircle, Smartphone, ShieldAlert,
  Shield, CheckSquare, Square, X, Building, Layers, Sliders, ChevronDown
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import {
  AdminUser, UserRole, UserType, UserChannel, UserPermissions, ActionRights,
  PermissionSectionKey, PERMISSION_GROUPS, ROLE_CONFIG, normalizeUserPermissions,
  defaultRights
} from '@/lib/adminUsers';

// Color palette mapping for avatar badges
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'U';
}

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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // User Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('staff');
  const [formType, setFormType] = useState<UserType>('EMPLOYEE');
  const [formDepartment, setFormDepartment] = useState('Operations / Dispatch');
  const [formDesignation, setFormDesignation] = useState('Packing & Dispatch Staff');
  const [formHomeBranch, setFormHomeBranch] = useState('Solapur Main Branch');
  const [formChannel, setFormChannel] = useState<UserChannel>('Web');
  const [formPassword, setFormPassword] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // Permission Matrix State (Screenshot 2 Modal)
  const [permTargetUser, setPermTargetUser] = useState<AdminUser | null>(null);
  const [permName, setPermName] = useState('');
  const [permCategory, setPermCategory] = useState('Pages');
  const [permMatrix, setPermMatrix] = useState<Record<PermissionSectionKey, ActionRights>>({} as any);

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

  // Open Create User Modal
  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('staff');
    setFormType('EMPLOYEE');
    setFormDepartment('Operations / Dispatch');
    setFormDesignation('Packing & Dispatch Staff');
    setFormHomeBranch('Solapur Main Warehouse');
    setFormChannel('Web');
    setFormPassword('');
    setFormPin('2026');
    setFormIsActive(true);
    setFormNotes('');
    setIsUserModalOpen(true);
  };

  // Open Edit User Details Modal
  const openEditUserModal = (u: AdminUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormEmail(u.email || '');
    setFormPhone(u.phone || '');
    setFormRole(u.role);
    setFormType(u.user_type || ROLE_CONFIG[u.role].user_type);
    setFormDepartment(u.department || ROLE_CONFIG[u.role].department);
    setFormDesignation(u.designation || ROLE_CONFIG[u.role].designation);
    setFormHomeBranch(u.home_branch || ROLE_CONFIG[u.role].home_branch);
    setFormChannel(u.channel || ROLE_CONFIG[u.role].channel);
    setFormPassword(u.password || '');
    setFormPin(u.pin || '');
    setFormIsActive(u.is_active);
    setFormNotes(u.notes || '');
    setIsUserModalOpen(true);
  };

  const ensureActionRights = (r?: Partial<ActionRights> | null): ActionRights => ({
    view: Boolean(r?.view),
    add: Boolean(r?.add),
    change: Boolean(r?.change),
    delete: Boolean(r?.delete),
    download: Boolean(r?.download),
  });

  // Open Edit Permission Modal (Screenshot 2)
  const openEditPermissionModal = (u: AdminUser) => {
    setPermTargetUser(u);
    setPermName((u.designation || ROLE_CONFIG[u.role].nameEn).toUpperCase());
    setPermCategory('Pages');

    // Initialize matrix from user's permissions or role defaults
    const currentMatrix = u.permissions?.matrix || ROLE_CONFIG[u.role].defaultPermissions.matrix || {};
    const fullMatrix: Record<PermissionSectionKey, ActionRights> = {} as any;

    PERMISSION_GROUPS.forEach((grp) => {
      grp.sections.forEach((sec) => {
        fullMatrix[sec.key] = ensureActionRights(currentMatrix[sec.key]);
      });
    });

    setPermMatrix(fullMatrix);
    setIsPermissionModalOpen(true);
  };

  // Apply quick preset to Permission Matrix in Modal
  const applyPresetToMatrix = (role: UserRole) => {
    const preset = ROLE_CONFIG[role];
    setPermName(preset.nameEn.toUpperCase());
    const defaults = preset.defaultPermissions.matrix || {};
    const nextMatrix: Record<PermissionSectionKey, ActionRights> = {} as any;

    PERMISSION_GROUPS.forEach((grp) => {
      grp.sections.forEach((sec) => {
        nextMatrix[sec.key] = ensureActionRights(defaults[sec.key]);
      });
    });
    setPermMatrix(nextMatrix);
  };

  // Toggle single action checkbox (view, add, change, delete, download)
  const toggleSectionAction = (secKey: PermissionSectionKey, action: keyof ActionRights) => {
    setPermMatrix((prev) => ({
      ...prev,
      [secKey]: {
        ...prev[secKey],
        [action]: !prev[secKey]?.[action],
      },
    }));
  };

  // Toggle all actions in an App group
  const toggleAppGroup = (groupId: string) => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;

    // Check if all are currently enabled
    const allEnabled = group.sections.every((sec) => {
      const rights = permMatrix[sec.key];
      return rights?.view && rights?.add && rights?.change && rights?.delete && rights?.download;
    });

    const targetVal = !allEnabled;
    const next = { ...permMatrix };
    group.sections.forEach((sec) => {
      next[sec.key] = {
        view: targetVal,
        add: targetVal,
        change: targetVal,
        delete: targetVal,
        download: targetVal,
      };
    });
    setPermMatrix(next);
  };

  // Check if App group is all selected
  const isAppGroupAllSelected = (groupId: string) => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return false;
    return group.sections.every((sec) => {
      const r = permMatrix[sec.key];
      return r?.view && r?.add && r?.change && r?.delete && r?.download;
    });
  };

  // Save User Details
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const roleConfig = ROLE_CONFIG[formRole];
      const payload: Partial<AdminUser> = {
        name: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        role: formRole,
        user_type: formType,
        department: formDepartment.trim() || roleConfig.department,
        designation: formDesignation.trim() || roleConfig.designation,
        home_branch: formHomeBranch.trim() || roleConfig.home_branch,
        channel: formChannel,
        password: formPassword.trim(),
        pin: formPin.trim() || null,
        is_active: formIsActive,
        notes: formNotes.trim() || null,
      };

      if (!editingUser) {
        payload.permissions = roleConfig.defaultPermissions;
      }

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

      setIsUserModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error saving user');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Permissions Matrix (Screenshot 2 Modal)
  const handleSavePermissions = async () => {
    if (!permTargetUser) return;
    setSubmitting(true);
    try {
      // Build both matrix and legacy boolean flags
      const updatedPermissions: UserPermissions = {
        manage_products: Boolean(permMatrix.products?.change || permMatrix.categories?.change),
        view_products: Boolean(permMatrix.products?.view),
        address_printer: Boolean(permMatrix.address_printer?.view || permMatrix.shipping_printer?.view),
        shipping_master: Boolean(permMatrix.shipping_master?.view),
        backdate_pickup: Boolean(permMatrix.backdate_pickup?.view || permMatrix.backdate_pickup?.add),
        view_shipping_spend: Boolean(permMatrix.costs_spend?.view),
        send_tracking: Boolean(permMatrix.whatsapp_tracking?.view || permMatrix.whatsapp_tracking?.add),
        courier_portal: Boolean(permMatrix.courier_portal?.view),
        manage_users: Boolean(permMatrix.manage_users?.view),
        matrix: permMatrix,
      };

      const res = await fetch(`/api/admin/users/${permTargetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: updatedPermissions,
          designation: permName || permTargetUser.designation,
        }),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to update permissions');

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setIsPermissionModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error saving permissions');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (u: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      const updated = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
      }
    } catch {
      // ignore
    }
  };

  // Delete user
  const handleDeleteUser = async (u: AdminUser) => {
    if (!window.confirm(tx(`Permanently delete account for "${u.name}"?`, `"${u.name}" चे खाते कायमचे हटवायचे का?`))) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
      }
    } catch {
      // ignore
    }
  };

  // Toggle select all users
  const handleToggleSelectAll = (visibleUsers: AdminUser[]) => {
    const ids = visibleUsers.map((u) => u.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search.trim() ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.phone && u.phone.includes(search)) ||
        (u.department && u.department.toLowerCase().includes(search.toLowerCase())) ||
        (u.designation && u.designation.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchType = typeFilter === 'all' || (u.user_type || 'EMPLOYEE') === typeFilter;

      return matchSearch && matchRole && matchType;
    });
  }, [users, search, roleFilter, typeFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gold/15 flex items-center justify-center text-gold">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-charcoal">
              {tx('Users & Permissions Directory', 'वापरकर्ते व परवानग्या व्यवस्थापन')}
            </h1>
          </div>
          <p className="text-xs text-charcoal-light mt-1">
            {tx(
              'Manage staff accounts, department groupings, mobile channel permissions, and security roles.',
              'स्टाफ लॉगिन, विभाग ग्रुपिंग, परमिशन सेट्स आणि सुरक्षा अधिकार नियंत्रित करा.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2.5 rounded-xl border border-border-warm bg-white hover:bg-ivory text-charcoal transition-colors shadow-2xs"
            title={tx('Refresh', 'रिफ्रेश करा')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal text-white text-xs sm:text-sm font-semibold hover:bg-charcoal/90 transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-gold" />
            <span>{tx('Add New User', '+ नवीन युझर जोडा')}</span>
          </button>
        </div>
      </div>

      {/* Cloud Persistence Notice if Supabase table is not yet run */}
      {!isTablePresent && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {tx(
                'Supabase admin_users table is running on active preloaded memory. To permanently persist custom accounts in database, run supabase/admin_users.sql in Supabase SQL editor.',
                'Supabase डेटाबेसमध्ये कायमस्वरूपी सेव्ह करण्यासाठी supabase/admin_users.sql स्क्रिप्ट रन करा.'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`-- Run supabase/admin_users.sql in Supabase SQL Editor`);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
            className="font-bold underline text-amber-800 hover:text-amber-900"
          >
            {copiedSql ? '✓ Copied' : 'Copy Script Path'}
          </button>
        </div>
      )}

      {/* Main Container - Directory Table (Screenshot 1 Style) */}
      <div className="bg-white rounded-3xl border border-border-warm shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-border-warm/80 bg-ivory-dark/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-charcoal-light/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tx('Search users by name, contact, department...', 'नाव, संपर्क किंवा विभाग शोधा...')}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-border-warm bg-white focus:outline-none focus:border-gold shadow-2xs font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl border border-border-warm bg-white text-charcoal focus:outline-none focus:border-gold font-medium"
            >
              <option value="all">{tx('All Roles', 'सर्व रोल्स')}</option>
              <option value="staff">{tx('Packing & Dispatch Staff', 'पॅकिंग व डिस्पॅच स्टाफ')}</option>
              <option value="support">{tx('Customer Care & Chat Support', 'कस्टमर केअर व चॅट')}</option>
              <option value="courier_partner">{tx('Courier Delivery Partner', 'कुरिअर डिलिव्हरी पार्टनर')}</option>
              <option value="admin">{tx('Store Admin', 'स्टोअर ॲडमीन')}</option>
              <option value="super_admin">{tx('Super Admin', 'सुपर ॲडमीन')}</option>
            </select>

            {/* User Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl border border-border-warm bg-white text-charcoal focus:outline-none focus:border-gold font-medium"
            >
              <option value="all">{tx('All Types', 'सर्व प्रकार')}</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="MANAGER">MANAGER</option>
              <option value="PARTNER">PARTNER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <span className="text-xs font-semibold text-charcoal-light bg-ivory px-2.5 py-1.5 rounded-lg border border-border-warm">
              {filteredUsers.length} {tx('users', 'वापरकर्ते')}
            </span>
          </div>
        </div>

        {/* Directory Table matching Screenshot 1 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-dark/40 text-charcoal-light uppercase tracking-wider font-semibold border-b border-border-warm text-[11px]">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all users"
                    checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.includes(u.id))}
                    onChange={() => handleToggleSelectAll(filteredUsers)}
                    className="rounded border-border-warm text-gold focus:ring-gold cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 font-semibold">{tx('User', 'वापरकर्ता')}</th>
                <th className="px-4 py-3.5 font-semibold">{tx('Contact', 'संपर्क')}</th>
                <th className="px-3 py-3.5 font-semibold">{tx('Type', 'प्रकार')}</th>
                <th className="px-3 py-3.5 font-semibold">{tx('Home Branch', 'होम ब्रांच')}</th>
                <th className="px-3 py-3.5 font-semibold">{tx('Channel', 'माध्यम')}</th>
                <th className="px-3 py-3.5 font-semibold">{tx('Department', 'विभाग')}</th>
                <th className="px-3 py-3.5 font-semibold">{tx('Designation', 'पद')}</th>
                <th className="px-3 py-3.5 font-semibold">{tx('Status', 'स्थिती')}</th>
                <th className="px-4 py-3.5 text-right font-semibold">{tx('Actions', 'कृती')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm/70">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-charcoal-light">
                    <RefreshCw className="w-6 h-6 animate-spin text-gold mx-auto mb-2" />
                    <span>{tx('Loading users directory…', 'वापरकर्ते लोड होत आहेत…')}</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-charcoal-light">
                    <Users className="w-8 h-8 text-charcoal-light/40 mx-auto mb-2" />
                    <p className="font-semibold text-charcoal">{tx('No users found', 'कोणताही वापरकर्ता सापडला नाही')}</p>
                    <p className="text-xs text-charcoal-light mt-1">
                      {tx('Try adjusting your search or add a new user.', 'फिल्टर बदला किंवा नवीन युझर ॲड करा.')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = getInitials(u.name);
                  const avatarColor = getAvatarColor(u.name);
                  const uType = u.user_type || ROLE_CONFIG[u.role].user_type;
                  const uDept = u.department || ROLE_CONFIG[u.role].department;
                  const uDesig = u.designation || ROLE_CONFIG[u.role].designation;
                  const uBranch = u.home_branch || ROLE_CONFIG[u.role].home_branch;
                  const uChannel = u.channel || ROLE_CONFIG[u.role].channel;
                  const isSelected = selectedUserIds.includes(u.id);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-ivory/40 transition-colors ${isSelected ? 'bg-gold/10' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-4 text-center align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${u.name}`}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedUserIds((prev) =>
                              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className="rounded border-border-warm text-gold focus:ring-gold cursor-pointer"
                        />
                      </td>

                      {/* User (Avatar + Name + Subtext) */}
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border flex-shrink-0 ${avatarColor}`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-charcoal text-xs sm:text-sm">{u.name}</div>
                            <div className="text-[11px] text-blue-600 font-medium">{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="text-xs text-charcoal">{u.email || `${u.username}@quickindialogistics.com`}</div>
                          <div className="text-[11px] font-mono text-charcoal-light">
                            {u.phone || '9842171815'}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            uType === 'MANAGER'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : uType === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : uType === 'PARTNER'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {uType}
                        </span>
                      </td>

                      {/* Home Branch */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap text-xs text-charcoal font-medium">
                        {uBranch}
                      </td>

                      {/* Channel */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap text-xs text-charcoal-light">
                        {uChannel}
                      </td>

                      {/* Department */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap text-xs text-charcoal font-medium">
                        {uDept}
                      </td>

                      {/* Designation */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap text-xs text-charcoal-light">
                        {uDesig}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={tx('Click to toggle active status', 'स्थिती बदलण्यासाठी क्लिक करा')}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-600' : 'bg-rose-600'}`}
                          />
                          <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Permission Button (Screenshot 2 Trigger) */}
                          <button
                            type="button"
                            onClick={() => openEditPermissionModal(u)}
                            className="p-1.5 text-charcoal-light hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                            title={tx('Edit Permission Set', 'परमिशन सेट बदला')}
                          >
                            <Shield className="w-4 h-4 text-gold" />
                          </button>

                          {/* Edit User Details */}
                          <button
                            type="button"
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 text-charcoal-light hover:text-charcoal hover:bg-ivory rounded-lg transition-colors"
                            title={tx('Edit User Info', 'माहिती बदला')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          {u.role !== 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-charcoal-light hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={tx('Delete Account', 'खाते हटवा')}
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PERMISSION MODAL (SCREENSHOT 2 REPLICA)                     */}
      {/* ========================================================================= */}
      {isPermissionModalOpen && permTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 border border-border-warm shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                    {tx('Edit Permission', 'परवानग्या बदला')}
                  </h3>
                  <p className="text-xs text-charcoal-light">
                    {tx(
                      'Tick what this permission set allows — assign it to users from EMS → Users',
                      'या परमिशन सेटमध्ये कोणत्या सुविधा द्यायच्या आहेत ते टिक करा.'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPermissionModalOpen(false)}
                className="p-1.5 rounded-xl text-charcoal-light hover:text-charcoal hover:bg-ivory"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* Permission Name & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">
                    {tx('Permission Name*', 'परमिशन सेट नाव*')}
                  </label>
                  <input
                    type="text"
                    value={permName}
                    onChange={(e) => setPermName(e.target.value)}
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs font-semibold text-charcoal bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">
                    {tx('Category*', 'कॅटेगरी*')}
                  </label>
                  <select
                    value={permCategory}
                    onChange={(e) => setPermCategory(e.target.value)}
                    className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs font-semibold text-charcoal bg-white focus:outline-none focus:border-gold"
                  >
                    <option value="Pages">Pages</option>
                    <option value="Apps">Apps</option>
                    <option value="Modules">Modules</option>
                  </select>
                </div>
              </div>

              {/* Role Presets Bar */}
              <div className="p-3 bg-ivory/60 rounded-2xl border border-border-warm flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  {tx('Apply Standard Role Preset:', 'रोल प्रीसेट निवडा:')}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyPresetToMatrix('staff')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    📦 Packing & Dispatch Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetToMatrix('support')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    💬 Customer Care & Support
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetToMatrix('courier_partner')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors"
                  >
                    🚚 Courier Delivery Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetToMatrix('admin')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                  >
                    👔 Store Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetToMatrix('super_admin')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    👑 Super Admin
                  </button>
                </div>
              </div>

              {/* PERMISSIONS Matrix Table matching Screenshot 2 */}
              <div className="border border-border-warm rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-ivory/80 px-4 py-2 border-b border-border-warm font-bold text-xs uppercase tracking-wider text-charcoal">
                  {tx('PERMISSIONS', 'परवानग्या यादी')}
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-white border-b border-border-warm text-[11px] text-charcoal-light font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 w-1/4">{tx('App', 'ॲप')}</th>
                      <th className="px-4 py-2.5 w-1/4">{tx('Section', 'विभाग')}</th>
                      <th className="px-3 py-2.5 text-center font-bold">{tx('View', 'पहा')}</th>
                      <th className="px-3 py-2.5 text-center font-bold">{tx('Add', 'जोडा')}</th>
                      <th className="px-3 py-2.5 text-center font-bold">{tx('Change', 'बदला')}</th>
                      <th className="px-3 py-2.5 text-center font-bold">{tx('Delete', 'हटवा')}</th>
                      <th className="px-3 py-2.5 text-center font-bold">{tx('Download', 'डाऊनलोड')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-warm/70">
                    {PERMISSION_GROUPS.map((group) => {
                      const isGroupChecked = isAppGroupAllSelected(group.id);
                      return (
                        <tr key={group.id} className="contents">
                          {/* Group Master Row */}
                          <tr className="bg-ivory/40 font-semibold border-t border-border-warm">
                            <td className="px-4 py-2.5 text-charcoal font-bold flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleAppGroup(group.id)}
                                className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                                  isGroupChecked ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                title={tx('Toggle all permissions for this app', 'या ॲपच्या सर्व परवानग्या बदला')}
                              >
                                {isGroupChecked ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-transparent" />}
                              </button>
                              <span>{isMr ? group.nameMr : group.nameEn}</span>
                            </td>
                            <td className="px-4 py-2.5 text-charcoal-light text-[11px] font-bold uppercase">
                              {tx('All Section', 'सर्व सेक्शन्स')}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={group.sections.every((s) => permMatrix[s.key]?.view)}
                                onChange={() => {
                                  const target = !group.sections.every((s) => permMatrix[s.key]?.view);
                                  const next = { ...permMatrix };
                                  group.sections.forEach((s) => {
                                    next[s.key] = { ...(next[s.key] || defaultRights(false)), view: target };
                                  });
                                  setPermMatrix(next);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={group.sections.every((s) => permMatrix[s.key]?.add)}
                                onChange={() => {
                                  const target = !group.sections.every((s) => permMatrix[s.key]?.add);
                                  const next = { ...permMatrix };
                                  group.sections.forEach((s) => {
                                    next[s.key] = { ...(next[s.key] || defaultRights(false)), add: target };
                                  });
                                  setPermMatrix(next);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={group.sections.every((s) => permMatrix[s.key]?.change)}
                                onChange={() => {
                                  const target = !group.sections.every((s) => permMatrix[s.key]?.change);
                                  const next = { ...permMatrix };
                                  group.sections.forEach((s) => {
                                    next[s.key] = { ...(next[s.key] || defaultRights(false)), change: target };
                                  });
                                  setPermMatrix(next);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={group.sections.every((s) => permMatrix[s.key]?.delete)}
                                onChange={() => {
                                  const target = !group.sections.every((s) => permMatrix[s.key]?.delete);
                                  const next = { ...permMatrix };
                                  group.sections.forEach((s) => {
                                    next[s.key] = { ...(next[s.key] || defaultRights(false)), delete: target };
                                  });
                                  setPermMatrix(next);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={group.sections.every((s) => permMatrix[s.key]?.download)}
                                onChange={() => {
                                  const target = !group.sections.every((s) => permMatrix[s.key]?.download);
                                  const next = { ...permMatrix };
                                  group.sections.forEach((s) => {
                                    next[s.key] = { ...(next[s.key] || defaultRights(false)), download: target };
                                  });
                                  setPermMatrix(next);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          </tr>

                          {/* Individual Section Rows */}
                          {group.sections.map((sec) => {
                            const r = permMatrix[sec.key] || defaultRights(false);
                            return (
                              <tr key={sec.key} className="hover:bg-ivory/30 transition-colors">
                                <td className="px-4 py-2 text-charcoal-light/70 text-[11px] pl-11">
                                  {isMr ? group.nameMr : group.nameEn}
                                </td>
                                <td className="px-4 py-2 text-charcoal font-medium">
                                  <div>{isMr ? sec.labelMr : sec.labelEn}</div>
                                  <div className="text-[10px] text-charcoal-light/70">{sec.descriptionEn}</div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(r.view)}
                                    onChange={() => toggleSectionAction(sec.key, 'view')}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(r.add)}
                                    onChange={() => toggleSectionAction(sec.key, 'add')}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(r.change)}
                                    onChange={() => toggleSectionAction(sec.key, 'change')}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(r.delete)}
                                    onChange={() => toggleSectionAction(sec.key, 'delete')}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(r.download)}
                                    onChange={() => toggleSectionAction(sec.key, 'download')}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-warm">
              <button
                type="button"
                onClick={() => setIsPermissionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-light hover:bg-ivory"
              >
                {tx('Cancel', 'रद्द करा')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSavePermissions}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-40 shadow-xs"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{tx('Save & Update Permissions', 'परवानग्या सेव्ह करा')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: USER PROFILE & LOGIN FORM                                       */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-border-warm shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {editingUser ? tx('Edit User Profile', 'युझर माहिती बदला') : tx('Create Staff Account', 'नवीन स्टाफ खाते तयार करा')}
                </h3>
                <p className="text-xs text-charcoal-light">
                  {tx('Configure login username, password, department, and branch', 'लॉगिन माहिती, विभाग आणि ब्रँच सेट करा')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-xl text-charcoal-light hover:text-charcoal hover:bg-ivory"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Full Name*', 'पूर्ण नाव*')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Aaradhya Singh"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Username / Login ID*', 'युझरनेम / लॉगिन आयडी*')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. aaradhya.singh"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-mono bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Role Preset*', 'मुख्य रोल*')}
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setFormRole(newRole);
                      const def = ROLE_CONFIG[newRole];
                      setFormType(def.user_type);
                      setFormDepartment(def.department);
                      setFormDesignation(def.designation);
                      setFormHomeBranch(def.home_branch);
                      setFormChannel(def.channel);
                    }}
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:border-gold text-charcoal"
                  >
                    <option value="staff">{tx('Packing & Dispatch Staff', 'पॅकिंग व डिस्पॅच स्टाफ')}</option>
                    <option value="support">{tx('Customer Care & Chat Support', 'कस्टमर केअर व चॅट')}</option>
                    <option value="courier_partner">{tx('Courier Delivery Partner', 'कुरिअर डिलिव्हरी पार्टनर')}</option>
                    <option value="admin">{tx('Store Admin', 'स्टोअर ॲडमीन')}</option>
                    <option value="super_admin">{tx('Super Admin (Store Owner)', 'सुपर ॲडमीन')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('User Type*', 'प्रकार*')}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as UserType)}
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:border-gold text-charcoal"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="PARTNER">PARTNER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Department', 'विभाग')}
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Operations / Dispatch"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Designation', 'पद')}
                  </label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Admin Executive"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Home Branch', 'होम ब्रांच')}
                  </label>
                  <input
                    type="text"
                    value={formHomeBranch}
                    onChange={(e) => setFormHomeBranch(e.target.value)}
                    placeholder="e.g. Solapur Main Branch"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Channel', 'माध्यम')}
                  </label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value as UserChannel)}
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-gold text-charcoal"
                  >
                    <option value="Web">Web</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Web + Mobile">Web + Mobile</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Email', 'ईमेल')}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@shubhangicollection.in"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Mobile Phone', 'मोबाईल नंबर')}
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 9850486591"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-mono bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('Password*', 'पासवर्ड*')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="e.g. Welcome@2026"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-mono bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    {tx('4-Digit Quick PIN (Optional)', '४-अंकी पिन (पर्यायी)')}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-mono bg-ivory/30 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-gold focus:ring-gold"
                  />
                  <span className="text-xs font-semibold text-charcoal">
                    {tx('Account is Active & Allowed to Sign In', 'खाते सक्रिय आहे व लॉगिन चालू ठेवा')}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-warm">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-light hover:bg-ivory"
                >
                  {tx('Cancel', 'रद्द करा')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-40 shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{tx('Save User', 'युझर सेव्ह करा')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
