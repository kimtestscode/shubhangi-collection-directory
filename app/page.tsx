'use client';
import { useEffect, useState, useMemo } from 'react';
import { Product, ProductFilters } from '@/lib/types';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import SearchBar from '@/components/catalog/SearchBar';
import CategoryFilter from '@/components/catalog/CategoryFilter';
import ProductGrid from '@/components/catalog/ProductGrid';
import FeaturedSection from '@/components/catalog/FeaturedSection';

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({ search: '', category: 'All' });

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featured = useMemo(() => products.filter((p) => p.featured), [products]);

  const filtered = useMemo(() => {
    const q = filters.search?.toLowerCase() || '';
    const cat = filters.category || 'All';
    return products.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCat = cat === 'All' || p.category === cat;
      return matchSearch && matchCat;
    });
  }, [products, filters]);

  const showFeatured = !filters.search && filters.category === 'All';

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-gold font-medium mb-2">New Collection</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-charcoal leading-tight mb-4">
            Fashion Jewellery
            <br />
            <span className="font-semibold">Crafted with Love</span>
          </h1>
          <div className="h-px w-20 bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light max-w-md mx-auto text-sm">
            Browse our exclusive collection and send us a WhatsApp message to enquire about any piece.
          </p>
        </div>

        {!loading && showFeatured && <FeaturedSection products={featured} />}

        <div className="sticky top-16 z-30 bg-ivory/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border-warm mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="sm:w-72">
              <SearchBar value={filters.search || ''} onChange={(v) => setFilters({ ...filters, search: v })} />
            </div>
            <div className="flex-1 overflow-x-auto">
              <CategoryFilter
                selected={filters.category || 'All'}
                onChange={(c) => setFilters({ ...filters, category: c })}
              />
            </div>
          </div>
        </div>

        {!loading && (
          <p className="text-sm text-charcoal-light mb-6">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'} found
          </p>
        )}

        <ProductGrid products={filtered} loading={loading} />
      </main>
      <Footer />
    </>
  );
}
