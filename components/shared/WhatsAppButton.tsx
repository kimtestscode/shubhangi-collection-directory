'use client';
import { MessageCircle } from 'lucide-react';
import { Product } from '@/lib/types';
import { generateWhatsAppUrl } from '@/lib/whatsapp';

interface Props {
  product: Product;
  variant?: 'card' | 'detail';
}

export default function WhatsAppButton({ product, variant = 'card' }: Props) {
  const handleClick = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const productUrl = `${siteUrl}/products/${product.slug}`;
    const waUrl = generateWhatsAppUrl(product, productUrl);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'detail') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#128C7E] active:scale-[0.98] text-white font-semibold py-4 px-6 rounded-xl shadow-sm transition-all duration-150 text-base cursor-pointer select-none"
        aria-label={`Enquire about ${product.name} on WhatsApp`}
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        Enquire on WhatsApp
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center gap-1.5 w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#128C7E] active:scale-[0.98] text-white font-semibold py-2 px-3 rounded-lg shadow-sm transition-all duration-150 text-sm cursor-pointer select-none"
      aria-label={`Enquire about ${product.name} on WhatsApp`}
    >
      <MessageCircle className="w-4 h-4 fill-current" />
      WhatsApp Enquiry
    </button>
  );
}
