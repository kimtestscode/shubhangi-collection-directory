import { createAdminClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  if (!product) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-charcoal font-semibold">Edit Product</h1>
        <p className="text-charcoal-light text-sm mt-1">
          {product.name} &mdash; SKU: {product.sku}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-border-warm p-6">
        <ProductForm mode="edit" product={product} />
      </div>
    </div>
  );
}
