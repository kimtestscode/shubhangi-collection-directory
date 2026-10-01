'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'mr';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.all_products': 'All Products',
    'nav.categories': 'Categories',
    'nav.add_product': 'Add Product',
    'nav.address_printer': 'Address Printer',
    'nav.help': 'Help & Guide',
    'nav.live_store': 'View Live Store',
    'nav.sign_out': 'Sign Out',
    'nav.admin_panel': 'Admin Panel',

    // Common Actions
    'action.save': 'Save Changes',
    'action.saving': 'Saving...',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.status_editor': 'Photo Edit for Status',
    'action.bulk_edit': 'Bulk Edit',
    'action.import_csv': 'Import CSV',
    'action.export_csv': 'Export CSV',
    'action.download': 'Download',
    'action.share_whatsapp': 'Post to WhatsApp',

    // Product & Inventory
    'product.name': 'Product Name',
    'product.price': 'Price',
    'product.regular_price': 'Regular Price',
    'product.stock': 'Stock Qty',
    'product.category': 'Category',
    'product.status': 'Status',
    'product.in_stock': 'In Stock',
    'product.out_of_stock': 'Out of Stock',
    'product.variants': 'Variants',

    // Language
    'lang.name': 'English',
    'lang.switch_prompt': 'मराठी मध्ये वापरा',
  },
  mr: {
    // Nav
    'nav.all_products': 'सर्व उत्पादने',
    'nav.categories': 'कॅटेगरी (वर्ग)',
    'nav.add_product': 'नवीन उत्पादन जोडा',
    'nav.address_printer': 'पत्ता प्रिंटर (पार्सल)',
    'nav.help': 'मदत आणि मार्गदर्शक',
    'nav.live_store': 'वेबसाईट पहा',
    'nav.sign_out': 'लॉगआउट',
    'nav.admin_panel': 'ऍडमीन पॅनेल',

    // Common Actions
    'action.save': 'बदल सेव्ह करा',
    'action.saving': 'सेव्ह होत आहे...',
    'action.cancel': 'रद्द करा',
    'action.delete': 'डिलीत करा',
    'action.edit': 'बदल करा',
    'action.status_editor': 'स्टेटससाठी फोटो एडिट',
    'action.bulk_edit': 'बल्क एडिट',
    'action.import_csv': 'CSV इम्पोर्ट',
    'action.export_csv': 'CSV डाऊनलोड',
    'action.download': 'डाऊनलोड',
    'action.share_whatsapp': 'व्हॉट्सॲपवर पाठवा',

    // Product & Inventory
    'product.name': 'उत्पादनाचे नाव',
    'product.price': 'किंमत (रु.)',
    'product.regular_price': 'मूळ किंमत (एमआरपी)',
    'product.stock': 'शिल्लक स्टॉक',
    'product.category': 'कॅटेगरी',
    'product.status': 'उपलब्धता',
    'product.in_stock': 'स्टॉकमध्ये उपलब्ध',
    'product.out_of_stock': 'स्टॉक संपला',
    'product.variants': 'व्हेरियंट्स (रंग/साईझ)',

    // Language
    'lang.name': 'मराठी',
    'lang.switch_prompt': 'Switch to English',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shubhangi_lang') as Language;
      if (stored === 'en' || stored === 'mr') {
        setLangState(stored);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('shubhangi_lang', newLang);
    } catch {
      // Ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'mr' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    return translations[lang]?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
