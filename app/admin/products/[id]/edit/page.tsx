import { createAdminClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';

function attachMetadata(prod: any) {
  if (!prod) return prod;
  if (prod.description && prod.description.includes('<!-- SC_META:')) {
    const match = prod.description.match(/<!-- SC_META:(.*?) -->/);
    if (match && match[1]) {
      try {
        const meta = JSON.parse(match[1]);
        return {
          ...meta,
          ...prod,
          barcode: prod.barcode ?? meta.barcode ?? null,
          categories: prod.categories ?? meta.categories ?? (prod.category ? [prod.category] : []),
          subcategories: prod.subcategories ?? meta.subcategories ?? [],
          jewelry_type: prod.jewelry_type ?? meta.jewelry_type ?? 'imitation',
          stock_quantity: prod.stock_quantity ?? meta.stock_quantity ?? 0,
          rack_number: prod.rack_number ?? meta.rack_number ?? null,
          box_number: prod.box_number ?? meta.box_number ?? null,
          slot_number: prod.slot_number ?? meta.slot_number ?? null,
          vendor_id: prod.vendor_id ?? meta.vendor_id ?? null,
          is_new_arrival: prod.is_new_arrival ?? meta.is_new_arrival ?? false,
          is_best_seller: prod.is_best_seller ?? meta.is_best_seller ?? prod.featured ?? false,
          size_chart_url: prod.size_chart_url ?? meta.size_chart_url ?? null,
          price_includes_shipping: prod.price_includes_shipping ?? meta.price_includes_shipping ?? false,
          description: prod.description.replace(/<!-- SC_META:.*? -->/, '').trim(),
        };
      } catch {
        // ignore
      }
    }
  }
  return prod;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: rawProduct } = await supabase.from('products').select('*').eq('id', id).single();
  if (!rawProduct) notFound();

  const product = attachMetadata(rawProduct);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-charcoal font-semibold">Edit Product</h1>
        <p className="text-charcoal-light text-sm mt-1">
          {product.name} &mdash; SKU: <span className="font-mono text-charcoal font-medium">{product.sku}</span>
        </p>
      </div>
      <ProductForm mode="edit" product={product} />
    </div>
  );
}
