'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, Package, Plus, LogOut, Menu, X, ExternalLink, Tags, Printer } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const navItems = [
    { href: '/admin', label: 'All Products', icon: Package },
    { href: '/admin/categories', label: 'Categories', icon: Tags },
    { href: '/admin/products/new', label: 'Add Product', icon: Plus },
    { href: '/admin/address-printer', label: 'Address Printer', icon: Printer },
  ];

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row print:block print:min-h-0 print:bg-white print:p-0">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-charcoal text-ivory p-4 flex items-center justify-between sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-gold" />
          <div>
            <span className="font-serif text-lg font-semibold text-ivory">Shubhangi</span>
            <span className="text-[10px] tracking-widest text-ivory/50 uppercase ml-1.5 font-sans">Admin</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-ivory/80 hover:text-white rounded-lg focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar (Desktop + Mobile Slideover) */}
      <aside
        className={`w-60 bg-charcoal text-ivory min-h-screen flex flex-col fixed md:sticky top-0 left-0 z-40 transition-transform duration-300 ease-in-out no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="hidden md:flex p-6 border-b border-white/10 items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-gold" />
          <div>
            <div className="font-serif text-lg font-semibold">Shubhangi</div>
            <div className="text-[10px] tracking-widest text-ivory/50 uppercase">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-12 md:mt-0">
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
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between text-xs text-ivory/60 hover:text-gold py-1.5 transition-colors"
          >
            <span>View Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-sm text-red-300 hover:text-red-200 py-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
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
