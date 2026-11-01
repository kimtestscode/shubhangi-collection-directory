import ProductForm from '@/components/admin/ProductForm';

export default function AddProductPage() {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-charcoal font-semibold">Add New Product</h1>
        <p className="text-charcoal-light text-sm mt-1">
          Complete the details below to add a new jewelry piece to your inventory &amp; online catalogue.
        </p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
