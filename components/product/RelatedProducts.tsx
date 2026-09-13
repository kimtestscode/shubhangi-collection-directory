import { Product } from '@/lib/types';
import ProductCard from '@/components/catalog/ProductCard';

interface Props {
  products: Product[];
}

export default function RelatedProducts({ products }: Props) {
  if (products.length === 0) return null;
  return (
    <section className="mt-16">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-border-warm" />
        <h2 className="font-serif text-2xl text-charcoal whitespace-nowrap">You May Also Like</h2>
        <div className="h-px flex-1 bg-border-warm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.slice(0, 3).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
