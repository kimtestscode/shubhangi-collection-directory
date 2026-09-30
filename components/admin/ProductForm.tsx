'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, ProductInsert, CategoryItem, InlineVariant, OptionType } from '@/lib/types';
import { slugify, CATEGORIES } from '@/lib/utils';
import ImageUploader from './ImageUploader';
import { Loader2, Plus, X, Wand2, Trash2, CheckSquare, Square } from 'lucide-react';

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

/** Upload a single file to /api/upload and return its public URL */
async function uploadSingleFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  return data.url || null;
}

interface VariantOptionTypeInput {
  name: string;
  valuesText: string;
}

interface FormVariantRow {
  _key: string;
  id?: string;
  name: string;
  option_values: Record<string, string>;
  sku: string;
  barcode: string;
  price_override: number | null;
  stock: number;
  images: string[];
  is_active: boolean;
  _uploading?: boolean;
}

function generateVariantCombinations(
  optionTypes: { name: string; values: string[] }[]
): Record<string, string>[] {
  return optionTypes.reduce<Record<string, string>[]>((acc, opt) => {
    if (opt.values.length === 0) return acc;
    if (acc.length === 0) return opt.values.map(v => ({ [opt.name]: v }));
    const next: Record<string, string>[] = [];
    for (const combo of acc) {
      for (const v of opt.values) next.push({ ...combo, [opt.name]: v });
    }
    return next;
  }, []);
}

function variantLabel(optionValues: Record<string, string>): string {
  const vals = Object.values(optionValues);
  return vals.length > 0 ? vals.join(' – ') : 'Default';
}

function optionValuesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a), bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => a[k] === b[k]);
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

  // --- Variant state matching vireka ---
  const [hasVariants, setHasVariants] = useState(Boolean(product?.has_variants));
  const [variantOptionTypes, setVariantOptionTypes] = useState<VariantOptionTypeInput[]>(() => {
    if (product?.option_types && product.option_types.length > 0) {
      return product.option_types.map(o => ({
        name: o.name || (o as any).type || '',
        valuesText: o.values.join(', '),
      }));
    }
    return [{ name: 'Pattern', valuesText: '' }];
  });

  const [variantRows, setVariantRows] = useState<FormVariantRow[]>(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v, i) => {
        const optionValues = v.option_values || (v.name ? { Option: v.name } : {});
        const imgs = Array.isArray(v.images) && v.images.length > 0
          ? v.images
          : v.image ? [v.image] : [];
        return {
          _key: v.id || `var-${i}-${Date.now()}`,
          id: v.id,
          name: v.name || variantLabel(optionValues),
          option_values: optionValues,
          sku: v.sku || '',
          barcode: v.barcode || '',
          price_override: v.price_override ?? null,
          stock: v.stock ?? 0,
          images: imgs,
          is_active: v.is_active ?? true,
        };
      });
    }
    return [];
  });

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

  // --- Variant option types handlers ---
  const addOptionType = () => setVariantOptionTypes(prev => [...prev, { name: '', valuesText: '' }]);
  const removeOptionType = (i: number) => setVariantOptionTypes(prev => prev.filter((_, idx) => idx !== i));
  const updateOptionType = (i: number, field: 'name' | 'valuesText', val: string) => {
    setVariantOptionTypes(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  // --- Generate variants combinations (vireka logic) ---
  const regenerateVariantRows = () => {
    const optionTypes = variantOptionTypes
      .map(t => ({
        name: t.name.trim(),
        values: t.valuesText.split(',').map(v => v.trim()).filter(Boolean),
      }))
      .filter(t => t.name && t.values.length > 0);

    if (optionTypes.length === 0) return;

    const combos = generateVariantCombinations(optionTypes);
    const baseSku = (form.sku || '').toUpperCase();

    setVariantRows(prev => combos.map(combo => {
      const existing = prev.find(r => optionValuesEqual(r.option_values, combo));
      if (existing) return existing;

      const skuSuffix = Object.values(combo)
        .map(v => v.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase())
        .join('-');

      return {
        _key: `new-${Object.values(combo).join('-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: variantLabel(combo),
        option_values: combo,
        sku: baseSku ? `${baseSku}-${skuSuffix}` : '',
        barcode: '',
        price_override: null,
        stock: 0,
        images: [],
        is_active: true,
      };
    }));
  };

  const updateVariantRow = <K extends keyof FormVariantRow>(key: string, field: K, val: FormVariantRow[K]) => {
    setVariantRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r));
  };

  const removeVariantRow = (key: string) => {
    setVariantRows(prev => prev.filter(r => r._key !== key));
  };

  // Upload one photo into next open slot (max 3) for a variant
  const handleVariantRowImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVariantRows(prev => prev.map(r => r._key === key ? { ...r, _uploading: true } : r));
    const url = await uploadSingleFile(file);

    setVariantRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      const updatedImages = url ? [...r.images, url].slice(0, 3) : r.images;
      return {
        ...r,
        images: updatedImages,
        _uploading: false,
      };
    }));
    e.target.value = '';
  };

  const removeVariantRowImage = (key: string, url: string) => {
    setVariantRows(prev => prev.map(r => r._key === key ? { ...r, images: r.images.filter(i => i !== url) } : r));
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const cleanedOptionTypes: OptionType[] = hasVariants
      ? variantOptionTypes
          .filter(o => o.name.trim() && o.valuesText.trim())
          .map(o => ({
            name: o.name.trim(),
            values: o.valuesText.split(',').map(v => v.trim()).filter(Boolean),
          }))
      : [];

    const cleanedVariants: InlineVariant[] = hasVariants
      ? variantRows.map(r => ({
          name: r.name,
          option_values: r.option_values,
          sku: r.sku,
          barcode: r.barcode,
          price_override: r.price_override != null && !isNaN(r.price_override) ? Number(r.price_override) : null,
          stock: Number(r.stock) || 0,
          images: r.images,
          image: r.images[0] || '',
          is_active: r.is_active,
        }))
      : [];

    const payload = {
      ...form,
      price: form.price != null && String(form.price).trim() !== '' ? Number(form.price) : null,
      regular_price: form.regular_price != null && String(form.regular_price).trim() !== '' ? Number(form.regular_price) : null,
      has_variants: hasVariants,
      option_types: hasVariants ? cleanedOptionTypes : null,
      variants: hasVariants ? cleanedVariants : null,
      parent_sku: null,
      color: null,
      variant_type: null,
      product_type: hasVariants ? 'variable' : 'simple',
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
            placeholder="e.g. Royal Meenakari Choker Set" className={inputCls} />
        ))}

        {field('SKU / Product Code *', (
          <input type="text" required value={form.sku || ''} onChange={(e) => set('sku', e.target.value.toUpperCase())}
            placeholder="e.g. KAM-1IEFF" className={`${inputCls} font-mono`} />
        ), 'Unique product code. Variant SKUs inherit from this base code.')}

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

        {field('Original Price / MRP (₹)', (
          <input type="number" min="0" step="0.01" value={form.regular_price ?? ''} onChange={(e) => set('regular_price', e.target.value)}
            placeholder="e.g. 2499" className={inputCls} />
        ))}

        {field('Selling Price (₹) *', (
          <input type="number" min="0" step="0.01" required value={form.price ?? ''} onChange={(e) => set('price', e.target.value)}
            placeholder="e.g. 1850" className={inputCls} />
        ))}

        {field('URL Slug', (
          <input type="text" value={form.slug || ''} onChange={(e) => set('slug', slugify(e.target.value))}
            placeholder="auto-generated-from-name" className={`${inputCls} font-mono text-xs`} />
        ))}
      </div>

      {field('Description', (
        <textarea rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the product — material, occasion, specifications, etc." className={inputCls} />
      ))}

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="w-4 h-4 accent-gold" />
        <span className="text-sm font-medium text-charcoal">Feature this product (shown at top of catalogue)</span>
      </label>

      {/* ── Variant Section matching vireka screenshot ── */}
      <div className="border border-border-warm rounded-2xl overflow-hidden bg-white shadow-sm">
        <div
          onClick={() => setHasVariants(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-ivory/50 transition-colors select-none"
        >
          {hasVariants
            ? <CheckSquare className="w-5 h-5 text-gold flex-shrink-0" />
            : <Square className="w-5 h-5 text-charcoal-light flex-shrink-0" />
          }
          <div>
            <p className="text-sm font-semibold text-charcoal">This product has variants (size, color, etc.)</p>
            <p className="text-xs text-charcoal-light">Define option types, generate combinations, and assign individual SKUs, prices, stock, and photos.</p>
          </div>
        </div>

        {hasVariants && (
          <div className="border-t border-border-warm bg-ivory/30 p-5 space-y-5">

            {/* Option Types (vireka layout) */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal-light">Option Types</p>
              {variantOptionTypes.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    placeholder="Option name (e.g. Pattern)"
                    value={opt.name}
                    onChange={e => updateOptionType(idx, 'name', e.target.value)}
                    className="w-36 px-3 py-2 bg-white border border-border-warm rounded-xl text-charcoal text-xs focus:outline-none focus:border-gold"
                  />
                  <input
                    placeholder="Values, comma separated (e.g. Round Floral, Peacock)"
                    value={opt.valuesText}
                    onChange={e => updateOptionType(idx, 'valuesText', e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-border-warm rounded-xl text-charcoal text-xs focus:outline-none focus:border-gold"
                  />
                  {variantOptionTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOptionType(idx)}
                      className="p-1.5 text-charcoal-light hover:text-red-500 rounded-lg transition-colors"
                      title="Remove option type"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addOptionType}
                className="text-gold text-xs font-semibold hover:underline flex items-center gap-1"
              >
                + Add Option Type
              </button>
            </div>

            {/* Generate Variants button */}
            <button
              type="button"
              onClick={regenerateVariantRows}
              className="flex items-center gap-2 border border-gold/60 text-gold hover:bg-gold/10 text-xs font-semibold px-4 py-2 rounded-xl transition-colors bg-white shadow-sm"
            >
              <Wand2 className="w-3.5 h-3.5 text-gold" />
              Generate Variants
            </button>

            {/* Variants table (vireka layout & columns) */}
            {variantRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border-warm bg-white shadow-sm">
                <table className="w-full text-xs min-w-[760px]">
                  <thead>
                    <tr className="bg-ivory-dark border-b border-border-warm">
                      <th className="text-left py-2.5 px-3 font-semibold text-charcoal-light">Variant</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-charcoal-light">SKU</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-charcoal-light">Barcode</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-charcoal-light">Price Override</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-charcoal-light">Stock</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-charcoal-light min-w-[140px]">Image URL</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-charcoal-light">Active</th>
                      <th className="py-2.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-warm">
                    {variantRows.map((row) => (
                      <tr key={row._key} className="hover:bg-ivory/40 transition-colors">
                        {/* Variant label */}
                        <td className="py-2.5 px-3 font-semibold text-charcoal whitespace-nowrap">
                          {row.name}
                        </td>

                        {/* SKU */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={e => updateVariantRow(row._key, 'sku', e.target.value.toUpperCase())}
                            className={`${cellInputCls} font-mono w-32`}
                            placeholder="SKU"
                          />
                        </td>

                        {/* Barcode */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.barcode}
                            onChange={e => updateVariantRow(row._key, 'barcode', e.target.value)}
                            className={`${cellInputCls} font-mono w-28`}
                            placeholder="Barcode"
                          />
                        </td>

                        {/* Price Override */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price_override ?? ''}
                            onChange={e => updateVariantRow(row._key, 'price_override', e.target.value === '' ? null : Number(e.target.value))}
                            placeholder={form.price ? `₹${form.price}` : '0'}
                            className={`${cellInputCls} w-24`}
                          />
                        </td>

                        {/* Stock */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            value={row.stock}
                            onChange={e => updateVariantRow(row._key, 'stock', Number(e.target.value))}
                            className={`${cellInputCls} w-16`}
                          />
                        </td>

                        {/* Image URL Slots (max 3 slots, vireka pattern) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map((slot) => {
                              const url = row.images[slot];
                              if (url) {
                                return (
                                  <div key={slot} className="relative group w-8 h-8 rounded-lg overflow-hidden border border-border-warm flex-shrink-0 bg-white">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => removeVariantRowImage(row._key, url)}
                                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Remove photo"
                                    >
                                      <X className="w-2.5 h-2.5 text-white" />
                                    </button>
                                  </div>
                                );
                              }

                              // Only the next open slot is an active upload button
                              if (slot === row.images.length) {
                                return (
                                  <label
                                    key={slot}
                                    className={`w-8 h-8 border border-dashed border-border-warm rounded-lg flex items-center justify-center cursor-pointer hover:border-gold hover:text-gold text-charcoal-light transition-colors flex-shrink-0 bg-white ${row._uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                    title="Add photo for this variant"
                                  >
                                    {row._uploading
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
                                      : <Plus className="w-3.5 h-3.5" />
                                    }
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/webp"
                                      className="hidden"
                                      onChange={e => handleVariantRowImageUpload(row._key, e)}
                                      disabled={row._uploading}
                                    />
                                  </label>
                                );
                              }

                              return <div key={slot} className="w-8 h-8 flex-shrink-0" />;
                            })}
                          </div>
                        </td>

                        {/* Active checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={e => updateVariantRow(row._key, 'is_active', e.target.checked)}
                            className="w-4 h-4 accent-gold cursor-pointer"
                          />
                        </td>

                        {/* Delete row */}
                        <td className="py-2.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(row._key)}
                            className="text-charcoal-light hover:text-red-500 p-1 rounded transition-colors"
                            title="Delete this variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[11px] text-charcoal-light">
              Price Override is optional — leave blank to use the base price above. Base Stock Qty is ignored once variants are generated; each variant tracks its own stock.
            </p>
          </div>
        )}
      </div>

      {/* Product-level images (cover / fallback) */}
      {field(hasVariants ? 'Product Images (cover & fallback gallery)' : 'Product Images', (
        <ImageUploader images={form.images || []} onChange={handleImagesChange} />
      ), 'First image is the primary thumbnail shown in the catalogue.')}

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
