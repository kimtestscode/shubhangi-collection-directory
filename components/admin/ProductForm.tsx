'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, ProductInsert, ProductType, CategoryItem } from '@/lib/types';
import { slugify, CATEGORIES } from '@/lib/utils';
import ImageUploader from './ImageUploader';
import { Loader2 } from 'lucide-react';

interface Props {
  product?: Product;
  mode: 'create' | 'edit';
}

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'hidden', label: 'Hidden (not shown publicly)' },
];

export default function ProductForm({ product, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<string[]>(CATEGORIES.filter(c => c !== 'All'));

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c: CategoryItem) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState<Partial<ProductInsert>>({
    sku: product?.sku || '',
    name: product?.name || '',
    slug: product?.slug || '',
    category: product?.category || 'Necklaces',
    description: product?.description || '',
    price: product?.price ?? undefined,
    regular_price: product?.regular_price ?? undefined,
    currency: product?.currency || 'INR',
    availability: product?.availability || 'available',
    images: product?.images || [],
    thumbnail: product?.thumbnail || '',
    featured: product?.featured || false,
    product_type: product?.product_type || 'simple',
    parent_sku: product?.parent_sku || '',
    color: product?.color || '',
  });

  const set = (k: keyof ProductInsert, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (name: string) => {
    set('name', name);
    if (mode === 'create') set('slug', slugify(name));
  };

  const handleImagesChange = (imgs: string[]) => {
    set('images', imgs);
    if (imgs.length > 0) set('thumbnail', imgs[0]);
    else set('thumbnail', '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      price: form.price !== undefined && form.price !== null && String(form.price).trim() !== '' ? Number(form.price) : null,
      regular_price: form.regular_price !== undefined && form.regular_price !== null && String(form.regular_price).trim() !== '' ? Number(form.regular_price) : null,
      parent_sku: form.parent_sku || null,
      color: form.color || null,
    };

    const res = mode === 'create'
      ? await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch(`/api/products/${product!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Something went wrong.');
      setSaving(false);
    }
  };

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full border border-border-warm rounded-xl px-4 py-2.5 text-sm text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field('Product Name *', (
          <input
            type="text" required value={form.name || ''} onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Royal Kundan Necklace Set" className={inputCls}
          />
        ))}

        {field('SKU / Product Code *', (
          <>
            <input
              type="text" required value={form.sku || ''} onChange={(e) => set('sku', e.target.value.toUpperCase())}
              placeholder="e.g. SC-NK-001" className={`${inputCls} font-mono`}
            />
            <p className="text-xs text-charcoal-light mt-1">Unique product identifier.</p>
          </>
        ))}

        {field('Product Type', (
          <select value={form.product_type} onChange={(e) => set('product_type', e.target.value as ProductType)} className={inputCls}>
            <option value="simple">Simple Product (Standalone)</option>
            <option value="variable">Variable Product (Parent container for colors)</option>
            <option value="variation">Color Variation (Child product of a parent SKU)</option>
          </select>
        ))}

        {form.product_type === 'variation' && field('Parent Product SKU *', (
          <input
            type="text" required value={form.parent_sku || ''} onChange={(e) => set('parent_sku', e.target.value.toUpperCase())}
            placeholder="e.g. SC-NK-001" className={`${inputCls} font-mono`}
          />
        ))}

        {field('Color Variation Name', (
          <input
            type="text" value={form.color || ''} onChange={(e) => set('color', e.target.value)}
            placeholder="e.g. Ruby Red, Emerald Green, Gold" className={inputCls}
          />
        ))}

        {field('Category *', (
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ))}

        {field('Regular Price / MRP (₹)', (
          <input
            type="number" min="0" step="0.01" value={form.regular_price ?? ''} onChange={(e) => set('regular_price', e.target.value)}
            placeholder="Original price e.g. 3499 (Slashed)" className={inputCls}
          />
        ))}

        {field('Offer / Sale Price (₹)', (
          <input
            type="number" min="0" step="0.01" value={form.price ?? ''} onChange={(e) => set('price', e.target.value)}
            placeholder="Discounted selling price e.g. 2499" className={inputCls}
          />
        ))}

        {field('Availability', (
          <select value={form.availability} onChange={(e) => set('availability', e.target.value as any)} className={inputCls}>
            {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {field('URL Slug', (
          <input
            type="text" value={form.slug || ''} onChange={(e) => set('slug', slugify(e.target.value))}
            placeholder="auto-generated-from-name" className={`${inputCls} font-mono text-xs`}
          />
        ))}
      </div>

      {field('Description', (
        <textarea
          rows={4} value={form.description || ''} onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the product — material, occasion, size, etc." className={inputCls}
        />
      ))}

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)}
            className="w-4 h-4 accent-gold" />
          <span className="text-sm font-medium text-charcoal">Feature this product (shown at top of catalogue)</span>
        </label>
      </div>

      {field('Product Images', (
        <ImageUploader images={form.images || []} onChange={handleImagesChange} />
      ))}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit" disabled={saving}
          className="flex items-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving...' : mode === 'create' ? 'Add Product' : 'Save Changes'}
        </button>
        <button
          type="button" onClick={() => router.back()}
          className="border border-border-warm text-charcoal hover:border-gold hover:text-gold px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
