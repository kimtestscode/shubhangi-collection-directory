'use client';
import Link from 'next/link';
import { ShoppingBag, Menu, X, Languages } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/lib/languageContext';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, toggleLang } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-sm border-b border-border-warm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-gold" />
            <div>
              <div className="font-serif text-xl font-semibold text-charcoal leading-tight">
                Shubhangi
              </div>
              <div className="text-[10px] tracking-[0.2em] text-charcoal-light uppercase -mt-0.5">
                Collection
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-charcoal-light hover:text-charcoal gold-underline transition-colors">
              Catalogue
            </Link>
            <a
              href="https://wa.me/919004954792"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-charcoal-light hover:text-charcoal gold-underline transition-colors"
            >
              Contact
            </a>
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gold/40 text-gold hover:bg-gold hover:text-white transition-all shadow-2xs"
              title="Switch Language / भाषा बदला"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'मराठी' : 'English'}</span>
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-charcoal-light hover:text-charcoal"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border-warm py-4 space-y-3">
            <Link
              href="/"
              className="block text-sm text-charcoal-light hover:text-charcoal py-1"
              onClick={() => setMenuOpen(false)}
            >
              Catalogue
            </Link>
            <a
              href="https://wa.me/919004954792"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-charcoal-light hover:text-charcoal py-1"
            >
              Contact Us on WhatsApp
            </a>
            <div className="pt-2">
              <button
                type="button"
                onClick={toggleLang}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gold/40 text-gold hover:bg-gold hover:text-white transition-all w-full justify-center"
              >
                <Languages className="w-4 h-4" />
                <span>भाषा बदला / Switch to {lang === 'en' ? 'मराठी' : 'English'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
