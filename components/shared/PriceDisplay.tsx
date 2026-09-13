import { formatPrice } from '@/lib/utils';

interface Props {
  price: number | null; // Offer/Sale price
  regularPrice?: number | null; // MRP / Regular price
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceDisplay({ price, regularPrice, currency = 'INR', size = 'md' }: Props) {
  if (price === null && (!regularPrice || regularPrice === null)) {
    return <span className="text-charcoal-light font-medium text-sm">Price on request</span>;
  }

  const effectivePrice = price !== null ? price : regularPrice!;
  const hasDiscount = regularPrice && price && regularPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - price) / regularPrice) * 100)
    : 0;

  const sizeClasses = {
    sm: { main: 'text-sm font-semibold', reg: 'text-xs', badge: 'text-[10px]' },
    md: { main: 'text-base font-semibold', reg: 'text-xs', badge: 'text-[11px]' },
    lg: { main: 'text-2xl font-bold', reg: 'text-sm', badge: 'text-xs' },
  }[size];

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      {/* Offer Price */}
      <span className={`text-charcoal ${sizeClasses.main}`}>
        {formatPrice(effectivePrice, currency)}
      </span>

      {/* Slashed Regular Price */}
      {hasDiscount && (
        <span className={`line-through text-charcoal-light/70 font-normal ${sizeClasses.reg}`}>
          {formatPrice(regularPrice, currency)}
        </span>
      )}

      {/* Discount Tag */}
      {hasDiscount && discountPercent > 0 && (
        <span className={`font-semibold text-green-700 bg-green-100/80 px-1.5 py-0.5 rounded ${sizeClasses.badge}`}>
          {discountPercent}% OFF
        </span>
      )}
    </div>
  );
}
