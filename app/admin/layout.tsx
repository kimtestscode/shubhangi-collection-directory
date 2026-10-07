'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, Package, Plus, LogOut, Menu, X, ExternalLink, Tags, Printer, HelpCircle, Languages, QrCode, ScanLine } from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { lang, toggleLang, t } = useLanguage();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const navItems = [
    { href: '/admin', label: lang === 'mr' ? 'सर्व उत्पादने' : 'All Products', icon: Package },
    { href: '/admin/categories', label: lang === 'mr' ? 'कॅटेगरी' : 'Categories', icon: Tags },
    { href: '/admin/products/new', label: lang === 'mr' ? 'नवीन उत्पादन जोडा' : 'Add Product', icon: Plus },
    { href: '/admin/address-printer', label: lang === 'mr' ? 'पत्ता प्रिंटर' : 'Address Printer', icon: Printer },
    { href: '/admin/shipping-printer', label: lang === 'mr' ? 'पत्ता प्रिंट + QR (Beta)' : 'Address Print + QR (Beta)', icon: QrCode },
    { href: '/admin/shipping-master', label: lang === 'mr' ? 'शिपिंग मास्टर (Beta)' : 'Shipping Master (Beta)', icon: ScanLine },
    { href: '/admin/help', label: lang === 'mr' ? 'मदत व माहिती' : 'Help & Guide', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row print:block print:min-h-0 print:bg-white print:p-0">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-charcoal text-ivory p-4 flex items-center justify-between sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-gold" />
          <div>
            <span className="font-serif text-lg font-semibold text-ivory">Shubhangi</span>
            <span className="text-[10px] tracking-widest text-ivory/50 uppercase ml-1.5 font-sans">
              {lang === 'mr' ? 'ऍडमीन' : 'Admin'}
            </span>
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
            <span>{lang === 'mr' ? 'English' : 'मराठी'}</span>
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
                {lang === 'mr' ? 'ऍडमीन पॅनेल' : 'Admin Panel'}
              </div>
            </div>
          </div>
        </div>

        {/* Language Switcher Bar in Sidebar */}
        <div className="px-4 py-3 border-b border-white/10 bg-white/5">
          <button
            type="button"
            onClick={toggleLang}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-gold/20 hover:text-gold border border-white/15 text-ivory transition-all shadow-2xs"
            title="Switch Language / भाषा बदला"
          >
            <span className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-gold" />
              <span>{lang === 'mr' ? 'भाषा: मराठी' : 'Language: English'}</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-gold text-charcoal font-bold px-2 py-0.5 rounded shadow-xs">
              {lang === 'mr' ? 'Switch to Eng' : 'मराठी करा'}
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
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
            <span>{lang === 'mr' ? 'वेबसाईट उघडा' : 'View Live Store'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-sm text-red-300 hover:text-red-200 py-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'mr' ? 'लॉगआउट' : 'Sign Out'}</span>
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

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 min-w-0 print:p-0 print:m-0">
        {children}
      </div>
    </div>
  );
}
