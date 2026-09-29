'use client';
import Image from 'next/image';
import { InlineVariant } from '@/lib/types';

interface Props {
  variantType: string;       // e.g. "Color", "Pattern"
  variants: InlineVariant[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}

export default function VariantSelector({ variantType, variants, activeIdx, onSelect }: Props) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="space-y-2.5 border-t border-border-warm pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-light">
        {variantType}
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={v.sku || i}
              type="button"
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                isActive
                  ? 'bg-charcoal text-white border-charcoal shadow-md scale-[1.03]'
                  : 'bg-white text-charcoal border-border-warm hover:border-gold hover:text-gold hover:shadow-sm'
              }`}
              title={v.name}
            >
              {/* Variant image thumbnail */}
              {v.image && (
                <span className={`w-5 h-5 rounded overflow-hidden flex-shrink-0 border ${isActive ? 'border-white/30' : 'border-border-warm'}`}>
                  <Image src={v.image} alt={v.name} width={20} height={20} className="object-cover w-full h-full" />
                </span>
              )}
              {v.name}
              {v.price_override != null && (
                <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-gold'}`}>
                  ₹{v.price_override}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
