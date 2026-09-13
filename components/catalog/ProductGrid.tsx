import { Product } from '@/lib/types';
import ProductCard from './ProductCard';
import { PackageSearch } from 'lucide-react';

interface Props {
  products: Product[];
  loading?: boolean;
}

export default function ProductGrid({ products, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border-warm overflow-hidden animate-pulse">
            <div className="aspect-square bg-ivory-dark" />
            <div className="p-4 space-y-3">
              <div className="h-3 bg-ivory-dark rounded w-1/3" />
              <div className="h-5 bg-ivory-dark rounded w-3/4" />
              <div className="h-4 bg-ivory-dark rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PackageSearch className="w-14 h-14 text-border-warm mb-4" />
        <h3 className="font-serif text-2xl text-charcoal mb-2">No products found</h3>
        <p className="text-charcoal-light text-sm max-w-xs">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
