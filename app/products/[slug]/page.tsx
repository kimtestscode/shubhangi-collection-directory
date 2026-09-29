import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
import { Product, ProductVariant } from '@/lib/types';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import RelatedProducts from '@/components/product/RelatedProducts';
import ProductDetailClient from '@/components/product/ProductDetailClient';
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

/**
 * Fetch all variants for this product group.
 * A product group = parent + all its children (product_type = 'variation').
 * We return each variant with its own images so the switcher can show them inline.
 */
async function getVariants(product: Product): Promise<{ variants: ProductVariant[]; variantType: string | null }> {
  // Determine the parent SKU
  const parentSku = product.product_type === 'variation'
    ? product.parent_sku
    : product.product_type === 'variable'
      ? product.sku
      : null;

  if (!parentSku) return { variants: [], variantType: null };

  // Fetch all products that are part of this group (parent + all variations)
  const { data } = await supabase
    .from('products')
    .select('sku, name, slug, color, images, thumbnail, availability, price, regular_price, product_type, variant_type')
    .or(`sku.eq.${parentSku},parent_sku.eq.${parentSku}`)
    .neq('availability', 'hidden')
    .order('created_at', { ascending: true });

  if (!data) return { variants: [], variantType: null };

  // Only include variation children (not the parent variable product itself)
  const variationRows = data.filter(p => p.product_type === 'variation' && p.color);

  if (variationRows.length === 0) return { variants: [], variantType: null };

  // Determine variant type (use first variant's variant_type, fallback to 'Color')
  const variantType = variationRows[0]?.variant_type || 'Color';

  const variants: ProductVariant[] = variationRows.map(p => ({
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    variantValue: p.color!,
    images: p.images || [],
    thumbnail: p.thumbnail,
    isCurrent: p.slug === product.slug,
    availability: p.availability,
    price: p.price,
    regular_price: p.regular_price,
  }));

  return { variants, variantType };
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

  const { variants, variantType } = await getVariants(product);
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

        {/* Client component handles all variant switching state */}
        <ProductDetailClient
          product={product}
          variants={variants}
          variantType={variantType}
        />

        <div className="mt-6 flex justify-start">
          <CopyButton url={productUrl} />
        </div>

        <RelatedProducts products={related} />
      </main>
      <Footer />
    </>
  );
}
