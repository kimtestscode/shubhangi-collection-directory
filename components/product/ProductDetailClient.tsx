'use client';
import { useState } from 'react';
import { Product, InlineVariant } from '@/lib/types';
import ProductGallery from './ProductGallery';
import VariantSelector from './VariantSelector';
import PriceDisplay from '@/components/shared/PriceDisplay';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import WhatsAppButton from '@/components/shared/WhatsAppButton';

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Determine if using new inline variant system
  const hasInlineVariants = product.has_variants && product.variants && product.variants.length > 0;
  const inlineVariants: InlineVariant[] = product.variants || [];

  // Active variant data
  const activeVariant = hasInlineVariants ? inlineVariants[activeIdx] : null;

  // Images to display: use active variant's image, or fall back to product images
  const displayImages = hasInlineVariants && activeVariant?.image
    ? [activeVariant.image]
    : product.images;

  // Price: use variant price_override if set, else product base price
  const displayPrice = activeVariant?.price_override ?? product.price;

  // Derive variant type label from first option_type
  const variantTypeLabel = product.option_types?.[0]?.type || 'Options';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Gallery — instantly switches on variant select */}
      <ProductGallery images={displayImages} productName={product.name} />

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-gold font-medium mb-2">
            {product.category}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal leading-tight mb-3">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <AvailabilityBadge status={product.availability} />
            <span className="text-xs text-charcoal-light">
              SKU:{' '}
              <span className="font-mono font-medium">
                {activeVariant?.sku || product.sku}
              </span>
            </span>
            {activeVariant && (
              <span className="text-xs font-medium text-charcoal bg-ivory-dark px-2.5 py-0.5 rounded border border-border-warm">
                {variantTypeLabel}: {activeVariant.name}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="border-y border-border-warm py-4">
          <PriceDisplay
            price={displayPrice}
            regularPrice={product.regular_price}
            currency={product.currency}
            size="lg"
          />
          {displayPrice === null && !product.regular_price && (
            <p className="text-xs text-charcoal-light mt-1">
              Contact us on WhatsApp for pricing.
            </p>
          )}
        </div>

        {/* Inline Variant Selector */}
        {hasInlineVariants && (
          <VariantSelector
            variantType={variantTypeLabel}
            variants={inlineVariants}
            activeIdx={activeIdx}
            onSelect={setActiveIdx}
          />
        )}

        {product.description && (
          <p className="text-charcoal-light leading-relaxed text-sm">{product.description}</p>
        )}

        <div className="space-y-3 pt-2">
          <WhatsAppButton product={product} variant="detail" />
        </div>

        <div className="bg-ivory-dark rounded-xl p-4 text-xs text-charcoal-light space-y-1 border border-border-warm">
          <p>WhatsApp us to check current availability and delivery options.</p>
          <p>All jewellery is carefully packaged for safe delivery.</p>
        </div>
      </div>
    </div>
  );
}
