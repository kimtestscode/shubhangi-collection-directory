import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
});

export const metadata: Metadata = {
  title: {
    default: 'Shubhangi Collection — Fashion Jewellery',
    template: '%s | Shubhangi Collection',
  },
  description:
    'Browse our exclusive collection of fashion jewellery — necklaces, earrings, bangles, and more. WhatsApp us to enquire.',
  keywords: ['fashion jewellery', 'kundan', 'meenakari', 'indian jewellery', 'shubhangi collection'],
  openGraph: {
    siteName: 'Shubhangi Collection',
    type: 'website',
  },
};

import { LanguageProvider } from '@/lib/languageContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-ivory text-charcoal antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
