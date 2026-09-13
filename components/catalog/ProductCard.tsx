import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import WhatsAppButton from '@/components/shared/WhatsAppButton';
import PriceDisplay from '@/components/shared/PriceDisplay';

export default function ProductCard({ product }: { product: Product }) {
  const thumbnail = product.thumbnail || product.images?.[0] || '/placeholder.jpg';

  return (
    <div className="card-hover bg-white rounded-2xl border border-border-warm overflow-hidden flex flex-col">
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-ivory-dark overflow-hidden">
        <Image
          src={thumbnail}
          alt={product.name}
          fill
          className="object-cover hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {product.featured && (
          <span className="absolute top-2 left-2 bg-gold text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Featured
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-charcoal-light uppercase tracking-widest font-medium mb-1">
              {product.category}
            </p>
            <Link href={`/products/${product.slug}`}>
              <h3 className="font-serif text-lg font-semibold text-charcoal line-clamp-2 leading-tight hover:text-gold transition-colors">
                {product.name}
              </h3>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-1">
          <div>
            <PriceDisplay price={product.price} regularPrice={product.regular_price} currency={product.currency} size="sm" />
            <p className="text-[11px] text-charcoal-light mt-0.5">SKU: {product.sku}</p>
          </div>
          <AvailabilityBadge status={product.availability} />
        </div>

        <div className="flex gap-2 mt-auto pt-1">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 text-center border border-border-warm text-charcoal hover:border-gold hover:text-gold text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            View Details
          </Link>
          <div className="flex-1">
            <WhatsAppButton product={product} variant="card" />
          </div>
        </div>
      </div>
    </div>
  );
}
