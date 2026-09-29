'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Product, ProductInsert, CategoryItem, InlineVariant, OptionType } from '@/lib/types';
import { slugify, CATEGORIES } from '@/lib/utils';
import ImageUploader from './ImageUploader';
import Image from 'next/image';
import { Loader2, Plus, X, Wand2, ImagePlus, CheckSquare, Square } from 'lucide-react';

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

/** Upload a single file and return its URL */
async function uploadSingleFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  return data.url || null;
}

/** Cartesian product of arrays */
function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((prev) => arr.map((val) => [...prev, val])),
    [[]]
  );
}

export default function ProductForm({ product, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<string[]>(CATEGORIES.filter(c => c !== 'All'));

  // --- Core product fields ---
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
    product_type: 'simple',
    parent_sku: null,
    color: null,
    variant_type: null,
    has_variants: product?.has_variants || false,
    option_types: product?.option_types || null,
    variants: product?.variants || null,
  });

  // --- Inline variant state ---
  const [hasVariants, setHasVariants] = useState(product?.has_variants || false);
  const [optionTypes, setOptionTypes] = useState<{ type: string; valuesStr: string }[]>(
    product?.option_types?.map(o => ({ type: o.type, valuesStr: o.values.join(', ') })) || [
      { type: 'Color', valuesStr: '' }
    ]
  );
  const [variantRows, setVariantRows] = useState<InlineVariant[]>(
    product?.variants || []
  );
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);
  const variantImageRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCategories(data.map((c: CategoryItem) => c.name));
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof ProductInsert, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (name: string) => {
    set('name', name);
    if (mode === 'create') set('slug', slugify(name));
  };

  const handleImagesChange = (imgs: string[]) => {
    set('images', imgs);
    set('thumbnail', imgs[0] || '');
  };

  // --- Option type handlers ---
  const addOptionType = () => setOptionTypes(prev => [...prev, { type: '', valuesStr: '' }]);
  const removeOptionType = (i: number) => setOptionTypes(prev => prev.filter((_, idx) => idx !== i));
  const updateOptionType = (i: number, field: 'type' | 'valuesStr', val: string) => {
    setOptionTypes(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  // --- Generate variants from option types ---
  const generateVariants = () => {
    const parsed: string[][] = optionTypes
      .filter(o => o.type.trim() && o.valuesStr.trim())
      .map(o => o.valuesStr.split(',').map(v => v.trim()).filter(Boolean));

    if (parsed.length === 0) return;

    const combos = cartesian(parsed);
    const baseSku = (form.sku || '').toUpperCase();

    const newRows: InlineVariant[] = combos.map(combo => {
      const name = combo.join(' / ');
      const suffix = combo.map(v => v.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()).join('-');
      // Preserve existing row data if the variant name already exists
      const existing = variantRows.find(r => r.name === name);
      return existing || {
        name,
        sku: baseSku ? `${baseSku}-${suffix}` : '',
        barcode: '',
        price_override: null,
        stock: 0,
        image: '',
      };
    });

    setVariantRows(newRows);
  };

  // --- Variant row handlers ---
  const updateVariantRow = (i: number, field: keyof InlineVariant, val: string | number | null) => {
    setVariantRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const handleVariantImageUpload = async (i: number, files: FileList) => {
    const file = files[0];
    if (!file) return;
    setUploadingVariantIdx(i);
    const url = await uploadSingleFile(file);
    if (url) updateVariantRow(i, 'image', url);
    setUploadingVariantIdx(null);
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const parsedOptionTypes: OptionType[] = hasVariants
      ? optionTypes
          .filter(o => o.type.trim() && o.valuesStr.trim())
          .map(o => ({ type: o.type.trim(), values: o.valuesStr.split(',').map(v => v.trim()).filter(Boolean) }))
      : [];

    const payload = {
      ...form,
      price: form.price != null && String(form.price).trim() !== '' ? Number(form.price) : null,
      regular_price: form.regular_price != null && String(form.regular_price).trim() !== '' ? Number(form.regular_price) : null,
      has_variants: hasVariants,
      option_types: hasVariants ? parsedOptionTypes : null,
      variants: hasVariants ? variantRows : null,
      parent_sku: null,
      color: null,
      variant_type: null,
      product_type: 'simple',
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

  const field = (label: string, children: React.ReactNode, hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-charcoal-light mt-1">{hint}</p>}
    </div>
  );

  const inputCls = "w-full border border-border-warm rounded-xl px-4 py-2.5 text-sm text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 bg-white";
  const cellInputCls = "w-full border border-border-warm rounded-lg px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:border-gold bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Core fields ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field('Product Name *', (
          <input type="text" required value={form.name || ''} onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Royal Kundan Necklace Set" className={inputCls} />
        ))}

        {field('SKU / Product Code *', (
          <input type="text" required value={form.sku || ''} onChange={(e) => set('sku', e.target.value.toUpperCase())}
            placeholder="e.g. SC-NK-001" className={`${inputCls} font-mono`} />
        ), 'Unique product identifier. Variant SKUs are auto-generated from this.')}

        {field('Category *', (
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ))}

        {field('Availability', (
          <select value={form.availability} onChange={(e) => set('availability', e.target.value as any)} className={inputCls}>
            {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {field('Regular Price / MRP (₹)', (
          <input type="number" min="0" step="0.01" value={form.regular_price ?? ''} onChange={(e) => set('regular_price', e.target.value)}
            placeholder="Original price e.g. 3499" className={inputCls} />
        ))}

        {field('Offer / Sale Price (₹)', (
          <input type="number" min="0" step="0.01" value={form.price ?? ''} onChange={(e) => set('price', e.target.value)}
            placeholder="Selling price e.g. 2499" className={inputCls} />
        ))}

        {field('URL Slug', (
          <input type="text" value={form.slug || ''} onChange={(e) => set('slug', slugify(e.target.value))}
            placeholder="auto-generated-from-name" className={`${inputCls} font-mono text-xs`} />
        ))}
      </div>

      {field('Description', (
        <textarea rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the product — material, occasion, size, etc." className={inputCls} />
      ))}

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="w-4 h-4 accent-gold" />
        <span className="text-sm font-medium text-charcoal">Feature this product (shown at top of catalogue)</span>
      </label>

      {/* ── Variant toggle ── */}
      <div className="border border-border-warm rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setHasVariants(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-ivory transition-colors text-left"
        >
          {hasVariants
            ? <CheckSquare className="w-5 h-5 text-gold flex-shrink-0" />
            : <Square className="w-5 h-5 text-charcoal-light flex-shrink-0" />
          }
          <div>
            <p className="text-sm font-semibold text-charcoal">This product has variants (size, color, etc.)</p>
            <p className="text-xs text-charcoal-light">Define option types and generate variant rows, each with their own SKU, price, stock and image.</p>
          </div>
        </button>

        {hasVariants && (
          <div className="border-t border-border-warm bg-ivory/40 p-5 space-y-5">

            {/* Option Types */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal-light">Option Types</p>
              {optionTypes.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.type}
                    onChange={(e) => updateOptionType(i, 'type', e.target.value)}
                    placeholder="Type (e.g. Color)"
                    className="w-36 border border-border-warm rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-gold bg-white"
                  />
                  <input
                    type="text"
                    value={opt.valuesStr}
                    onChange={(e) => updateOptionType(i, 'valuesStr', e.target.value)}
                    placeholder="Values, comma separated (e.g. Red, Blue, Gold)"
                    className="flex-1 border border-border-warm rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-gold bg-white"
                  />
                  {optionTypes.length > 1 && (
                    <button type="button" onClick={() => removeOptionType(i)}
                      className="p-1.5 text-charcoal-light hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOptionType}
                className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Option Type
              </button>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={generateVariants}
              className="flex items-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Generate Variants
            </button>

            {/* Variants table */}
            {variantRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border-warm bg-white shadow-sm">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-ivory-dark border-b border-border-warm">
                      <th className="px-3 py-2.5 text-left font-semibold text-charcoal-light w-36">Variant</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-charcoal-light w-36">SKU</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-charcoal-light w-32">Barcode</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-charcoal-light w-32">Price Override (₹)</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-charcoal-light w-24">Stock</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-charcoal-light w-28">Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-warm">
                    {variantRows.map((row, i) => (
                      <tr key={i} className="hover:bg-ivory/50 transition-colors">
                        {/* Name */}
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-charcoal">{row.name}</span>
                        </td>
                        {/* SKU */}
                        <td className="px-3 py-2.5">
                          <input type="text" value={row.sku}
                            onChange={(e) => updateVariantRow(i, 'sku', e.target.value.toUpperCase())}
                            className={`${cellInputCls} font-mono`} placeholder="AUTO-SKU" />
                        </td>
                        {/* Barcode */}
                        <td className="px-3 py-2.5">
                          <input type="text" value={row.barcode}
                            onChange={(e) => updateVariantRow(i, 'barcode', e.target.value)}
                            className={cellInputCls} placeholder="Optional" />
                        </td>
                        {/* Price Override */}
                        <td className="px-3 py-2.5">
                          <input type="number" min="0" step="0.01"
                            value={row.price_override ?? ''}
                            onChange={(e) => updateVariantRow(i, 'price_override', e.target.value === '' ? null : Number(e.target.value))}
                            className={cellInputCls} placeholder="Use base price" />
                        </td>
                        {/* Stock */}
                        <td className="px-3 py-2.5">
                          <input type="number" min="0"
                            value={row.stock}
                            onChange={(e) => updateVariantRow(i, 'stock', Number(e.target.value))}
                            className={cellInputCls} />
                        </td>
                        {/* Image */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {row.image ? (
                              <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-border-warm flex-shrink-0 group">
                                <Image src={row.image} alt={row.name} fill className="object-cover" sizes="36px" />
                                <button type="button" onClick={() => updateVariantRow(i, 'image', '')}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <X className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-lg border-2 border-dashed border-border-warm bg-ivory flex-shrink-0" />
                            )}
                            <button
                              type="button"
                              onClick={() => variantImageRefs.current[i]?.click()}
                              disabled={uploadingVariantIdx === i}
                              className="flex items-center justify-center w-7 h-7 rounded-lg border border-border-warm bg-white hover:border-gold hover:text-gold text-charcoal-light transition-colors disabled:opacity-50"
                              title="Upload image for this variant"
                            >
                              {uploadingVariantIdx === i
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <ImagePlus className="w-3.5 h-3.5" />
                              }
                            </button>
                            <input
                              type="file" accept="image/*" className="hidden"
                              ref={(el) => { variantImageRefs.current[i] = el; }}
                              onChange={(e) => e.target.files && handleVariantImageUpload(i, e.target.files)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-charcoal-light px-4 py-2.5 border-t border-border-warm bg-ivory/30">
                  Price Override is optional — leave blank to use the base price above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product-level images (shown when no inline variants, or as fallback) */}
      {field(hasVariants ? 'Product Images (used as fallback / cover)' : 'Product Images', (
        <ImageUploader images={form.images || []} onChange={handleImagesChange} />
      ), 'First image is the thumbnail shown in the catalogue.')}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving...' : mode === 'create' ? 'Add Product' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-border-warm text-charcoal hover:border-gold hover:text-gold px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
