import ProductForm from '@/components/admin/ProductForm';

export default function AddProductPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-charcoal font-semibold">Add New Product</h1>
        <p className="text-charcoal-light text-sm mt-1">Fill in the details below to add a product to your catalogue.</p>
      </div>
      <div className="bg-white rounded-2xl border border-border-warm p-6">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
