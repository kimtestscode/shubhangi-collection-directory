'use client';
import { useState } from 'react';
import { Product, ProductVariant } from '@/lib/types';
import ProductGallery from './ProductGallery';
import VariantSelector from './VariantSelector';
import PriceDisplay from '@/components/shared/PriceDisplay';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import WhatsAppButton from '@/components/shared/WhatsAppButton';

interface Props {
  product: Product;
  variants: ProductVariant[];
  variantType: string | null;
}

export default function ProductDetailClient({ product, variants, variantType }: Props) {
  // Active variant state — start with current product as the active one
  const [activeImages, setActiveImages] = useState<string[]>(product.images);
  const [activeProduct, setActiveProduct] = useState<Product | ProductVariant>(product);

  const handleVariantChange = (variant: ProductVariant) => {
    setActiveImages(variant.images.length > 0 ? variant.images : product.images);
    setActiveProduct(variant);
  };

  const displayProduct = activeProduct;
  const displayImages = activeImages;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Gallery — instantly switches images on variant change */}
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
            <AvailabilityBadge status={'availability' in displayProduct ? displayProduct.availability : product.availability} />
            <span className="text-xs text-charcoal-light">
              SKU: <span className="font-mono font-medium">{'sku' in displayProduct ? displayProduct.sku : product.sku}</span>
            </span>
            {/* Show active variant value if applicable */}
            {'variantValue' in displayProduct && displayProduct.variantValue && variantType && (
              <span className="text-xs font-medium text-charcoal bg-ivory-dark px-2.5 py-0.5 rounded border border-border-warm">
                {variantType}: {displayProduct.variantValue}
              </span>
            )}
            {/* Fallback for simple product color */}
            {!('variantValue' in displayProduct) && product.color && !variantType && (
              <span className="text-xs font-medium text-charcoal bg-ivory-dark px-2.5 py-0.5 rounded border border-border-warm">
                {product.color}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="border-y border-border-warm py-4">
          <PriceDisplay
            price={'price' in displayProduct ? displayProduct.price : product.price}
            regularPrice={'regular_price' in displayProduct ? displayProduct.regular_price : product.regular_price}
            currency={product.currency}
            size="lg"
          />
          {(displayProduct as Product).price === null && !(displayProduct as Product).regular_price && (
            <p className="text-xs text-charcoal-light mt-1">
              Contact us on WhatsApp for pricing.
            </p>
          )}
        </div>

        {/* Variant Selector — inline, no page reload */}
        {variants.length > 1 && (
          <div className="space-y-2">
            {variantType && (
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-light">
                {variantType}:
              </p>
            )}
            <VariantSelector
              variants={variants}
              onVariantChange={handleVariantChange}
              currentVariantSku={product.sku}
            />
          </div>
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
