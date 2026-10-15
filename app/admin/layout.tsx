'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingBag, Package, Plus, LogOut, Menu, X, ExternalLink, Tags,
  Printer, HelpCircle, Languages, QrCode, ScanLine, Users, ShieldAlert,
  ArrowRight, Loader2, User as UserIcon
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import { hasPageAccess, getDefaultRedirect, ROLE_CONFIG, UserRole } from '@/lib/adminUsers';

interface CurrentUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  user_type?: string;
  department?: string | null;
  designation?: string | null;
  home_branch?: string | null;
  channel?: string;
  permissions?: any;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { lang, toggleLang } = useLanguage();
  const isMr = lang === 'mr';
  const tx = (en: string, mr: string) => (isMr ? mr : en);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.user) {
            setCurrentUser(data.user);
            // If user is a courier delivery partner, redirect directly to mobile /courier portal
            if (data.user.role === 'courier_partner' && !pathname.startsWith('/courier')) {
              router.push('/courier');
              return;
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const allNavItems = [
    { href: '/admin', label: isMr ? 'सर्व उत्पादने' : 'All Products', icon: Package },
    { href: '/admin/categories', label: isMr ? 'कॅटेगरी' : 'Categories', icon: Tags },
    { href: '/admin/products/new', label: isMr ? 'नवीन उत्पादन जोडा' : 'Add Product', icon: Plus },
    { href: '/admin/address-printer', label: isMr ? 'पत्ता प्रिंटर' : 'Address Printer', icon: Printer },
    { href: '/admin/shipping-printer', label: isMr ? 'पत्ता प्रिंट + QR (Beta)' : 'Address Print + QR (Beta)', icon: QrCode },
    { href: '/admin/shipping-master', label: isMr ? 'शिपिंग मास्टर (Beta)' : 'Shipping Master (Beta)', icon: ScanLine },
    { href: '/admin/users', label: isMr ? 'वापरकर्ते व परवानग्या' : 'Users & Permissions', icon: Users },
    { href: '/admin/help', label: isMr ? 'मदत व माहिती' : 'Help & Guide', icon: HelpCircle },
  ];

  // Dynamically filter navigation links based on user's granted permissions
  const filteredNavItems = currentUser
    ? allNavItems.filter((item) => hasPageAccess(currentUser, item.href))
    : allNavItems;

  const isPageAllowed = currentUser ? hasPageAccess(currentUser, pathname) : true;
  const recommendedLanding = currentUser ? getDefaultRedirect(currentUser.role) : '/admin';

  // Get initials for avatar badge
  const userInitials = (currentUser?.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'SC';

  const roleMeta = currentUser ? ROLE_CONFIG[currentUser.role] : null;

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row print:block print:min-h-0 print:bg-white print:p-0">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-charcoal text-ivory p-4 flex items-center justify-between sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs border border-gold/30">
            {userInitials}
          </div>
          <div>
            <div className="font-serif text-base font-semibold leading-none text-ivory">Shubhangi</div>
            <div className="text-[10px] text-ivory/60 mt-0.5">
              {currentUser?.designation || currentUser?.name || (isMr ? 'ऍडमीन' : 'Admin')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-ivory transition-colors"
            title="Switch Language / भाषा बदला"
          >
            <Languages className="w-3.5 h-3.5 text-gold" />
            <span>{isMr ? 'English' : 'मराठी'}</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-ivory/80 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop + Mobile Slideover) */}
      <aside
        className={`w-64 bg-charcoal text-ivory min-h-screen flex flex-col fixed md:sticky top-0 left-0 z-40 transition-transform duration-300 ease-in-out no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-gold" />
            <div>
              <div className="font-serif text-lg font-semibold leading-tight">Shubhangi</div>
              <div className="text-[10px] tracking-widest text-ivory/50 uppercase">
                {isMr ? 'ऍडमीन पॅनेल' : 'Staff Portal'}
              </div>
            </div>
          </div>
        </div>

        {/* Logged-In User Profile Card */}
        {currentUser && (
          <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold text-charcoal flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate" title={currentUser.name}>
                {currentUser.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/30 truncate">
                  {currentUser.designation || (roleMeta ? (isMr ? roleMeta.nameMr : roleMeta.nameEn) : currentUser.role)}
                </span>
              </div>
              {currentUser.home_branch && (
                <div className="text-[10px] text-ivory/50 truncate mt-0.5">
                  {currentUser.home_branch}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Language Switcher Bar in Sidebar */}
        <div className="px-4 py-2.5 border-b border-white/10 bg-white/5">
          <button
            type="button"
            onClick={toggleLang}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-gold/20 hover:text-gold border border-white/15 text-ivory transition-all shadow-2xs"
            title="Switch Language / भाषा बदला"
          >
            <span className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-gold" />
              <span>{isMr ? 'भाषा: मराठी' : 'Language: English'}</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-gold text-charcoal font-bold px-2 py-0.5 rounded shadow-xs">
              {isMr ? 'Eng' : 'मराठी'}
            </span>
          </button>
        </div>

        {/* Navigation Items (Role-filtered) */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                pathname === href
                  ? 'bg-gold text-white font-medium shadow-sm'
                  : 'text-ivory/70 hover:text-ivory hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between text-xs text-ivory/60 hover:text-gold py-1.5 transition-colors"
          >
            <span>{isMr ? 'वेबसाईट उघडा' : 'View Live Store'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-sm text-red-300 hover:text-red-200 py-1.5 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>{isMr ? 'लॉगआउट' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Overlay Backdrop for Mobile Menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
        />
      )}

      {/* Main Content Area or Access Denied Screen */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 min-w-0 print:p-0 print:m-0">
        {authLoading ? (
          <div className="p-12 text-center text-charcoal-light">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />
            <span className="text-xs">{tx('Checking session access…', 'प्रवेश तपासत आहे…')}</span>
          </div>
        ) : !isPageAllowed ? (
          /* Graceful Access Restricted Guard */
          <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-red-200 shadow-md text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-charcoal">
                {tx('Access Restricted to This Section', 'या पेजला प्रवेश प्रतिबंधित आहे')}
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-light mt-1.5 max-w-md mx-auto">
                {tx(
                  `Your assigned role (${currentUser?.designation || roleMeta?.nameEn || currentUser?.role}) does not have permission to view this section.`,
                  `तुमच्या रोलनुसार (${currentUser?.designation || roleMeta?.nameMr || currentUser?.role}) तुम्हाला या पेजची परवानगी नाही.`
                )}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href={recommendedLanding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 shadow-xs"
              >
                <span>
                  {tx(
                    `Go to ${currentUser?.role === 'staff' ? 'Shipping Master' : 'Permitted Portal'}`,
                    'तुमच्या मुख्य डॅशबोर्डवर जा'
                  )}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-xl border border-border-warm text-xs font-semibold text-charcoal hover:bg-ivory"
              >
                {tx('Switch Account', 'दुसरे खाते लॉगिन करा')}
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
