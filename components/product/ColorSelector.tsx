'use client';
import Link from 'next/link';

interface ColorVariation {
  color: string;
  slug: string;
  sku: string;
  isCurrent: boolean;
}

interface Props {
  variations: ColorVariation[];
}

export default function ColorSelector({ variations }: Props) {
  if (!variations || variations.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-border-warm pt-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-light">
        Available Color Variations:
      </label>
      <div className="flex flex-wrap gap-2">
        {variations.map((v) => (
          <Link
            key={v.sku}
            href={`/products/${v.slug}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              v.isCurrent
                ? 'bg-charcoal text-white border-charcoal shadow-sm'
                : 'bg-white text-charcoal border-border-warm hover:border-gold hover:text-gold'
            }`}
          >
            {v.color}
          </Link>
        ))}
      </div>
    </div>
  );
}
