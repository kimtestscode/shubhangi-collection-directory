import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
import { Product } from '@/lib/types';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import WhatsAppButton from '@/components/shared/WhatsAppButton';
import ProductGallery from '@/components/product/ProductGallery';
import RelatedProducts from '@/components/product/RelatedProducts';
import ColorSelector from '@/components/product/ColorSelector';
import PriceDisplay from '@/components/shared/PriceDisplay';
import CopyButton from './CopyButton';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .neq('availability', 'hidden')
    .single();
  return data;
}

async function getVariations(product: Product) {
  const targetParentSku = product.product_type === 'variation' ? product.parent_sku : product.sku;
  if (!targetParentSku) return [];

  const { data } = await supabase
    .from('products')
    .select('sku, name, slug, color')
    .or(`sku.eq.${targetParentSku},parent_sku.eq.${targetParentSku}`)
    .neq('availability', 'hidden');

  if (!data) return [];

  return data
    .filter(p => p.color)
    .map(p => ({
      color: p.color!,
      slug: p.slug,
      sku: p.sku,
      isCurrent: p.slug === product.slug,
    }));
}

async function getRelated(category: string, currentId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .neq('id', currentId)
    .neq('availability', 'hidden')
    .limit(3);
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: product.name,
    description: product.description || `${product.name} — SKU: ${product.sku}. Enquire on WhatsApp.`,
    openGraph: {
      title: `${product.name} | Shubhangi Collection`,
      description: product.description || undefined,
      images: product.thumbnail ? [{ url: product.thumbnail }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const variations = await getVariations(product);
  const related = await getRelated(product.category, product.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const productUrl = `${siteUrl}/products/${product.slug}`;

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-charcoal-light hover:text-charcoal mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Catalogue
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ProductGallery images={product.images} productName={product.name} />

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
                  SKU: <span className="font-mono font-medium">{product.sku}</span>
                </span>
                {product.color && (
                  <span className="text-xs font-medium text-charcoal bg-ivory-dark px-2.5 py-0.5 rounded border border-border-warm">
                    Color: {product.color}
                  </span>
                )}
              </div>
            </div>

            {/* Price Display with Slash format */}
            <div className="border-y border-border-warm py-4">
              <PriceDisplay
                price={product.price}
                regularPrice={product.regular_price}
                currency={product.currency}
                size="lg"
              />
              {product.price === null && (!product.regular_price) && (
                <p className="text-xs text-charcoal-light mt-1">
                  Contact us on WhatsApp for pricing.
                </p>
              )}
            </div>

            {/* Color Swatches */}
            <ColorSelector variations={variations} />

            {product.description && (
              <p className="text-charcoal-light leading-relaxed text-sm">{product.description}</p>
            )}

            <div className="space-y-3 pt-2">
              <WhatsAppButton product={product} variant="detail" />
              <CopyButton url={productUrl} />
            </div>

            <div className="bg-ivory-dark rounded-xl p-4 text-xs text-charcoal-light space-y-1 border border-border-warm">
              <p>WhatsApp us to check current availability and delivery options.</p>
              <p>All jewellery is carefully packaged for safe delivery.</p>
            </div>
          </div>
        </div>

        <RelatedProducts products={related} />
      </main>
      <Footer />
    </>
  );
}
