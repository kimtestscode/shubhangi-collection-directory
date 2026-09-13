import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-ivory/70 mt-20 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-gold" />
              <span className="font-serif text-xl text-ivory">Shubhangi Collection</span>
            </div>
            <p className="text-sm max-w-xs leading-relaxed">
              Premium fashion jewellery crafted with love. Browse our catalogue and enquire via WhatsApp.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-ivory font-medium mb-3">Get in touch</p>
            <a
              href="https://wa.me/919004954792"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-gold transition-colors"
            >
              WhatsApp: +91 9004954792
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-xs text-center">
          © {new Date().getFullYear()} Shubhangi Collection. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
