'use client';
import { useState, useMemo } from 'react';
import { Product, InlineVariant, OptionType } from '@/lib/types';
import ProductGallery from './ProductGallery';
import VariantSelector from './VariantSelector';
import PriceDisplay from '@/components/shared/PriceDisplay';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import { generateWhatsAppUrl } from '@/lib/whatsapp';
import { MessageCircle, Minus, Plus, Truck, ShieldCheck, Video, CheckCircle2 } from 'lucide-react';

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const hasVariants = Boolean(
    product.has_variants && product.option_types && product.option_types.length > 0
  );

  const optionTypes: OptionType[] = useMemo(() => {
    if (!product.option_types) return [];
    return product.option_types.map(o => ({
      name: o.name || (o as any).type || 'Option',
      values: o.values || [],
    }));
  }, [product.option_types]);

  const variants: InlineVariant[] = useMemo(() => {
    return product.variants || [];
  }, [product.variants]);

  // Pre-select first value for each option type
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (optionTypes.length > 0) {
      optionTypes.forEach(opt => {
        const optName = opt.name || opt.type || 'Option';
        if (opt.values.length > 0) {
          initial[optName] = opt.values[0];
        }
      });
    }
    return initial;
  });

  const [quantity, setQuantity] = useState(1);

  const handleSelectOption = (optName: string, val: string) => {
    setSelectedOptions(prev => ({ ...prev, [optName]: val }));
    setQuantity(1);
  };

  // Find matching variant based on selected options
  const selectedVariant = useMemo(() => {
    if (!hasVariants || variants.length === 0) return null;

    // First try strict match against option_values
    const exact = variants.find(v => {
      if (!v.option_values) return false;
      return Object.entries(selectedOptions).every(([k, val]) => v.option_values![k] === val);
    });
    if (exact) return exact;

    // Fallback: match by variant name substring
    const selectedVals = Object.values(selectedOptions);
    const byName = variants.find(v => {
      return selectedVals.every(val => v.name.toLowerCase().includes(val.toLowerCase()));
    });
    return byName || variants[0] || null;
  }, [hasVariants, variants, selectedOptions]);

  // Determine active images
  const displayImages = useMemo(() => {
    if (selectedVariant) {
      if (Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0) {
        return selectedVariant.images;
      }
      if (selectedVariant.image) {
        return [selectedVariant.image];
      }
    }
    return product.images && product.images.length > 0 ? product.images : [];
  }, [selectedVariant, product.images]);

  // Determine effective pricing
  const effectivePrice = selectedVariant?.price_override ?? product.price;
  const effectiveSku = selectedVariant?.sku || product.sku;
  const effectiveStock = selectedVariant ? (selectedVariant.stock ?? 0) : null;
  const isOutOfStock = product.availability === 'out_of_stock' || (effectiveStock !== null && effectiveStock <= 0);

  // Variant label for order
  const variantLabelText = useMemo(() => {
    if (!hasVariants) return undefined;
    const parts = Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`);
    return parts.join(' | ');
  }, [hasVariants, selectedOptions]);

  // WhatsApp click handler
  const handleWhatsAppOrder = () => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const productUrl = `${siteUrl}/products/${product.slug}`;
    const waUrl = generateWhatsAppUrl(product, productUrl, {
      variantLabel: variantLabelText,
      variantSku: effectiveSku,
      price: effectivePrice,
      quantity,
    });
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Product Image Gallery with multi-angle support and lightbox */}
      <ProductGallery images={displayImages} productName={product.name} />

      {/* Product Details & Actions */}
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-gold font-medium mb-2">
            {product.category}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal leading-tight mb-3">
            {product.name}
          </h1>

          <div className="flex items-center gap-3 flex-wrap">
            <AvailabilityBadge status={isOutOfStock ? 'out_of_stock' : product.availability} />
            <span className="text-xs text-charcoal-light">
              SKU:{' '}
              <span className="font-mono font-medium text-charcoal">
                {effectiveSku}
              </span>
            </span>
            {effectiveStock !== null && !isOutOfStock && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {effectiveStock} in stock
              </span>
            )}
          </div>
        </div>

        {/* Pricing Display */}
        <div className="border-y border-border-warm py-4">
          <div className="flex items-baseline gap-3">
            <PriceDisplay
              price={effectivePrice}
              regularPrice={product.regular_price}
              currency={product.currency}
              size="lg"
            />
            {product.regular_price && effectivePrice && product.regular_price > effectivePrice && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-200">
                Save ₹{product.regular_price - effectivePrice}
              </span>
            )}
          </div>
          {effectivePrice === null && !product.regular_price && (
            <p className="text-xs text-charcoal-light mt-1">
              Contact us on WhatsApp for current pricing and discounts.
            </p>
          )}
        </div>

        {/* Variant Selectors (vireka option types system) */}
        {hasVariants && (
          <VariantSelector
            optionTypes={optionTypes}
            variants={variants}
            selectedOptions={selectedOptions}
            onSelectOption={handleSelectOption}
          />
        )}

        {/* Quantity Selector */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal block">
            Quantity
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-border-warm rounded-xl bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center text-charcoal hover:bg-ivory disabled:opacity-40 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center text-sm font-semibold text-charcoal font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(prev => (effectiveStock ? Math.min(effectiveStock, prev + 1) : prev + 1))}
                disabled={effectiveStock !== null && quantity >= effectiveStock}
                className="w-10 h-10 flex items-center justify-center text-charcoal hover:bg-ivory disabled:opacity-40 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {effectivePrice && quantity > 1 && (
              <span className="text-xs text-charcoal font-medium">
                Total: ₹{(effectivePrice * quantity).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="text-charcoal-light leading-relaxed text-sm pt-1">
            <p>{product.description}</p>
          </div>
        )}

        {/* Direct WhatsApp Ordering Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleWhatsAppOrder}
            className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#128C7E] active:scale-[0.99] text-white font-semibold py-4 px-6 rounded-xl shadow-md transition-all duration-150 text-base cursor-pointer select-none"
            aria-label="Order on WhatsApp"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Order on WhatsApp</span>
          </button>
        </div>

        {/* Customer Trust & Assurance Badges (from vireka) */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="flex flex-col items-center text-center p-3 bg-ivory-dark/60 rounded-xl border border-border-warm">
            <Truck className="w-5 h-5 text-gold mb-1.5" />
            <span className="text-charcoal text-xs font-medium">Dispatch in 2-3 Days</span>
            <span className="text-[10px] text-charcoal-light">Safe Pan-India Shipping</span>
          </div>

          <div className="flex flex-col items-center text-center p-3 bg-ivory-dark/60 rounded-xl border border-border-warm">
            <ShieldCheck className="w-5 h-5 text-gold mb-1.5" />
            <span className="text-charcoal text-xs font-medium">Damage Covered</span>
            <span className="text-[10px] text-charcoal-light">Transit Insurance</span>
          </div>

          <div className="flex flex-col items-center text-center p-3 bg-ivory-dark/60 rounded-xl border border-border-warm">
            <Video className="w-5 h-5 text-gold mb-1.5" />
            <span className="text-charcoal text-xs font-medium">Opening Video</span>
            <span className="text-[10px] text-charcoal-light">Required on parcel receipt</span>
          </div>
        </div>

        {/* Direct WhatsApp notice */}
        <div className="bg-ivory-dark/40 rounded-xl p-3.5 text-xs text-charcoal-light space-y-1 border border-border-warm flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-charcoal">Direct Catalog Ordering</p>
            <p>Select your preferred option above and click Order on WhatsApp to immediately confirm stock availability and dispatch time with our team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
