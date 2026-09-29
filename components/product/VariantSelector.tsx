'use client';
import { useState, useTransition } from 'react';
import Image from 'next/image';
import { ProductVariant } from '@/lib/types';

interface Props {
  variants: ProductVariant[];
  onVariantChange: (variant: ProductVariant) => void;
  currentVariantSku: string;
}

export default function VariantSelector({ variants, onVariantChange, currentVariantSku }: Props) {
  const [active, setActive] = useState(currentVariantSku);
  const [, startTransition] = useTransition();

  if (!variants || variants.length <= 1) return null;

  // Determine variant type label from any variant (they should all share the same type)
  // We'll derive it from context passed in via the product page

  const handleSelect = (v: ProductVariant) => {
    setActive(v.sku);
    startTransition(() => {
      onVariantChange(v);
    });
  };

  return (
    <div className="space-y-3 border-t border-border-warm pt-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-light">
        Available Options:
      </label>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isActive = active === v.sku;
          return (
            <button
              key={v.sku}
              onClick={() => handleSelect(v)}
              disabled={v.availability === 'out_of_stock'}
              className={`relative group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                isActive
                  ? 'bg-charcoal text-white border-charcoal shadow-sm scale-[1.03]'
                  : v.availability === 'out_of_stock'
                    ? 'bg-gray-100 text-gray-400 border-border-warm cursor-not-allowed opacity-60'
                    : 'bg-white text-charcoal border-border-warm hover:border-gold hover:text-gold hover:shadow-sm'
              }`}
              aria-pressed={isActive}
              title={v.availability === 'out_of_stock' ? 'Out of stock' : v.variantValue}
            >
              {/* Thumbnail preview */}
              {v.thumbnail && (
                <span className={`w-5 h-5 rounded-md overflow-hidden flex-shrink-0 border ${isActive ? 'border-white/30' : 'border-border-warm'}`}>
                  <Image
                    src={v.thumbnail}
                    alt={v.variantValue}
                    width={20}
                    height={20}
                    className="object-cover w-full h-full"
                  />
                </span>
              )}
              {v.variantValue}
              {v.availability === 'out_of_stock' && (
                <span className="ml-1 text-[10px] text-gray-400">(Out of stock)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
