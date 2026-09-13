import { Product } from '@/lib/types';
import ProductCard from './ProductCard';

export default function FeaturedSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-border-warm" />
        <h2 className="font-serif text-2xl text-charcoal whitespace-nowrap">Featured Pieces</h2>
        <div className="h-px flex-1 bg-border-warm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
