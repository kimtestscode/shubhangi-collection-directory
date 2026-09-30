'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, Edit, Trash2, AlertCircle, Download, Upload, SlidersHorizontal, 
  Save, X, Check, Loader2, CheckSquare, Square, ChevronDown, ChevronRight, Layers, ImagePlus
} from 'lucide-react';
import { Product, ProductType, Availability, CategoryItem, InlineVariant } from '@/lib/types';
import { exportProductsToCSV } from '@/lib/csv';
import { CATEGORIES } from '@/lib/utils';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import CSVImportModal from '@/components/admin/CSVImportModal';
import PriceDisplay from '@/components/shared/PriceDisplay';

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  return data.url || null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORIES.filter(c => c !== 'All'));
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Bulk Edit States
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, Product>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [uploadingVariantKey, setUploadingVariantKey] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = () => {
    fetch('/api/products?all=1')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
          const initialMap: Record<string, Product> = {};
          data.forEach(p => { initialMap[p.id] = { ...p }; });
          setEditedProducts(initialMap);
        }
        setLoading(false);
      });

    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c: CategoryItem) => c.name));
        }
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const isProductChanged = (p: Product, ed?: Product) => {
    if (!ed) return false;
    return (
      ed.name !== p.name ||
      ed.sku !== p.sku ||
      ed.category !== p.category ||
      ed.price !== p.price ||
      ed.regular_price !== p.regular_price ||
      ed.availability !== p.availability ||
      ed.product_type !== p.product_type ||
      ed.has_variants !== p.has_variants ||
      ed.color !== p.color ||
      ed.featured !== p.featured ||
      JSON.stringify(ed.variants || []) !== JSON.stringify(p.variants || [])
    );
  };

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const p of products) {
      if (isProductChanged(p, editedProducts[p.id])) {
        count++;
      }
    }
    return count;
  }, [products, editedProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  };

  const handleExportCSV = () => {
    if (products.length === 0) return;
    const csvStr = exportProductsToCSV(products);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shubhangi_products_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Bulk Edit Handlers
  const handleCellChange = (id: string, field: keyof Product, value: any) => {
    setEditedProducts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleTypeChange = (id: string, type: 'simple' | 'variable') => {
    setEditedProducts((prev) => {
      const prod = prev[id];
      if (!prod) return prev;
      return {
        ...prev,
        [id]: {
          ...prod,
          product_type: type,
          has_variants: type === 'variable',
        },
      };
    });
  };

  const handleVariantCellChange = (productId: string, variantIdx: number, field: string, value: any) => {
    setEditedProducts((prev) => {
      const prod = prev[productId];
      if (!prod || !Array.isArray(prod.variants)) return prev;

      const updatedVariants = prod.variants.map((v, i) => {
        if (i !== variantIdx) return v;
        return {
          ...v,
          [field]: field === 'price_override'
            ? (value === '' ? null : Number(value))
            : field === 'stock'
              ? Number(value)
              : value,
        };
      });

      return {
        ...prev,
        [productId]: {
          ...prod,
          variants: updatedVariants,
        },
      };
    });
  };

  // Add a new variant row to product
  const handleAddVariant = (productId: string) => {
    setEditedProducts((prev) => {
      const prod = prev[productId];
      if (!prod) return prev;
      const currentVariants = Array.isArray(prod.variants) ? prod.variants : [];
      const count = currentVariants.length + 1;
      const baseSku = (prod.sku || 'SKU').toUpperCase();

      const newVariant: InlineVariant = {
        name: `Option ${count}`,
        option_values: { Option: `Option ${count}` },
        sku: `${baseSku}-VAR${count}`,
        barcode: '',
        price_override: null,
        stock: 0,
        images: [],
        image: '',
        is_active: true,
      };

      return {
        ...prev,
        [productId]: {
          ...prod,
          has_variants: true,
          product_type: 'variable',
          variants: [...currentVariants, newVariant],
        },
      };
    });

    // Make sure panel is open
    setExpandedVariantIds((prev) => new Set(prev).add(productId));
  };

  // Remove a variant row from product
  const handleRemoveVariant = (productId: string, variantIdx: number) => {
    setEditedProducts((prev) => {
      const prod = prev[productId];
      if (!prod || !Array.isArray(prod.variants)) return prev;
      const updatedVariants = prod.variants.filter((_, i) => i !== variantIdx);
      return {
        ...prev,
        [productId]: {
          ...prod,
          variants: updatedVariants,
        },
      };
    });
  };

  // Upload an image for a variant
  const handleVariantImageUpload = async (productId: string, variantIdx: number, file: File) => {
    const key = `${productId}-${variantIdx}`;
    setUploadingVariantKey(key);
    const url = await uploadFile(file);
    if (url) {
      setEditedProducts((prev) => {
        const prod = prev[productId];
        if (!prod || !Array.isArray(prod.variants)) return prev;
        const updatedVariants = prod.variants.map((v, i) => {
          if (i !== variantIdx) return v;
          const currentImgs = Array.isArray(v.images) ? v.images : [];
          const updatedImgs = [...currentImgs, url].slice(0, 3);
          return {
            ...v,
            images: updatedImgs,
            image: updatedImgs[0] || url,
          };
        });
        return {
          ...prev,
          [productId]: {
            ...prod,
            variants: updatedVariants,
          },
        };
      });
    }
    setUploadingVariantKey(null);
  };

  const toggleExpandVariants = (id: string) => {
    setExpandedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApplyBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return;

    if (bulkAction === 'delete') {
      if (!confirm(`Delete ${selectedIds.size} selected products?`)) return;
      setLoading(true);
      for (const id of Array.from(selectedIds)) {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
      }
      setSelectedIds(new Set());
      setBulkAction('');
      load();
      return;
    }

    if (bulkAction === 'set_variable') {
      setEditedProducts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          if (next[id]) next[id] = { ...next[id], product_type: 'variable', has_variants: true };
        });
        return next;
      });
    } else if (bulkAction === 'set_simple') {
      setEditedProducts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          if (next[id]) next[id] = { ...next[id], product_type: 'simple', has_variants: false };
        });
        return next;
      });
    } else if (['available', 'out_of_stock', 'coming_soon', 'hidden'].includes(bulkAction)) {
      setEditedProducts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          if (next[id]) next[id] = { ...next[id], availability: bulkAction as Availability };
        });
        return next;
      });
    } else if (categories.includes(bulkAction)) {
      setEditedProducts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          if (next[id]) next[id] = { ...next[id], category: bulkAction };
        });
        return next;
      });
    }

    setBulkAction('');
  };

  const handleSaveBulkChanges = async () => {
    const changedProducts: Product[] = [];
    for (const p of products) {
      const ed = editedProducts[p.id];
      if (ed && isProductChanged(p, ed)) {
        changedProducts.push(ed);
      }
    }

    if (changedProducts.length === 0) return;

    setBulkSaving(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: changedProducts }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        load();
      } else {
        alert('Failed to save bulk changes.');
      }
    } catch {
      alert('Error saving bulk changes.');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDiscardBulkChanges = () => {
    const initialMap: Record<string, Product> = {};
    products.forEach(p => { initialMap[p.id] = { ...p }; });
    setEditedProducts(initialMap);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-charcoal font-semibold">Products</h1>
          <p className="text-charcoal-light text-sm mt-1">{products.length} products in catalogue</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk Editor Toggle */}
          <button
            onClick={() => {
              if (isBulkEditMode) handleDiscardBulkChanges();
              setIsBulkEditMode((prev) => !prev);
            }}
            className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isBulkEditMode
                ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-inner'
                : 'border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold shadow-sm'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-700" />
            <span>{isBulkEditMode ? 'Exit Bulk Editor' : 'Bulk Editor'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 border border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>

          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Bulk Editor Action Bar */}
      {isBulkEditMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg">
              Bulk Edit Mode
            </span>
            <span className="text-xs text-amber-800">
              {selectedIds.size} of {products.length} selected
            </span>

            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:border-gold"
              >
                <option value="">Bulk Actions...</option>
                <optgroup label="Set Product Type">
                  <option value="set_variable">Set Type to Variable</option>
                  <option value="set_simple">Set Type to Simple</option>
                </optgroup>
                <optgroup label="Set Availability">
                  <option value="available">Mark Available</option>
                  <option value="out_of_stock">Mark Out of Stock</option>
                  <option value="coming_soon">Mark Coming Soon</option>
                  <option value="hidden">Mark Hidden</option>
                </optgroup>
                <optgroup label="Set Category">
                  {categories.map((c) => (
                    <option key={c} value={c}>Set Category to {c}</option>
                  ))}
                </optgroup>
                <optgroup label="Danger Zone">
                  <option value="delete">Delete Selected</option>
                </optgroup>
              </select>

              <button
                onClick={handleApplyBulkAction}
                disabled={selectedIds.size === 0 || !bulkAction}
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {modifiedCount > 0 && (
              <span className="text-xs font-medium text-amber-800">
                {modifiedCount} {modifiedCount === 1 ? 'product change' : 'product changes'} pending
              </span>
            )}

            {modifiedCount > 0 && (
              <button
                onClick={handleDiscardBulkChanges}
                className="flex items-center gap-1 border border-amber-300 text-amber-900 hover:bg-amber-100 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
            )}

            <button
              onClick={handleSaveBulkChanges}
              disabled={modifiedCount === 0 || bulkSaving}
              className="flex items-center gap-1.5 bg-charcoal hover:bg-charcoal/90 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
              {bulkSaving ? 'Saving...' : saveSuccess ? 'Saved!' : `Save ${modifiedCount > 0 ? modifiedCount : ''} Changes`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border-warm h-20 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border-warm">
          <AlertCircle className="w-10 h-10 text-border-warm mx-auto mb-3" />
          <p className="text-charcoal-light">No products yet.</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="text-gold hover:underline text-sm font-medium"
            >
              Import CSV
            </button>
            <span className="text-charcoal-light text-xs">•</span>
            <Link href="/admin/products/new" className="text-gold hover:underline text-sm font-medium">
              Add manually
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-warm overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border-warm bg-ivory-dark">
                {isBulkEditMode && (
                  <th className="px-3 py-3 w-10 text-center">
                    <button onClick={toggleSelectAll} className="text-charcoal hover:text-gold">
                      {selectedIds.size === products.length ? <CheckSquare className="w-4 h-4 text-gold" /> : <Square className="w-4 h-4 text-charcoal-light" />}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[220px]">Product Name</th>
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[130px]">SKU</th>
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[140px]">Category</th>
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[170px]">Type / Variants</th>
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[120px]">MRP (₹)</th>
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[120px]">Offer Price (₹)</th>
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[140px]">Availability</th>
                <th className="px-4 py-3 text-charcoal-light font-medium w-16 text-center">Featured</th>
                {!isBulkEditMode && <th className="px-4 py-3 text-charcoal-light font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm">
              {products.map((p) => {
                const ed = editedProducts[p.id] || p;
                const isChanged = isBulkEditMode && isProductChanged(p, ed);
                const isVariable = Boolean(
                  ed.has_variants || 
                  ed.product_type === 'variable' || 
                  (Array.isArray(ed.variants) && ed.variants.length > 0)
                );
                const variantList: InlineVariant[] = Array.isArray(ed.variants) ? ed.variants : [];
                const isExpanded = expandedVariantIds.has(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isChanged ? 'bg-amber-50/70 border-l-4 border-amber-400' : 'hover:bg-ivory/50'
                    }`}
                  >
                    {/* Checkbox */}
                    {isBulkEditMode && (
                      <td className="px-3 py-3 text-center align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          className="w-4 h-4 accent-gold cursor-pointer mt-1.5"
                        />
                      </td>
                    )}

                    {/* Name */}
                    <td className="px-4 py-3 align-top">
                      {isBulkEditMode ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={ed.name}
                            onChange={(e) => handleCellChange(p.id, 'name', e.target.value)}
                            className="w-full border border-border-warm focus:border-gold rounded-lg px-2.5 py-1.5 text-xs text-charcoal bg-white font-medium"
                          />
                          <div className="flex items-center gap-2">
                            {isVariable ? (
                              <button
                                type="button"
                                onClick={() => toggleExpandVariants(p.id)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200/80 px-2 py-0.5 rounded transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <span>{isExpanded ? 'Collapse' : `Edit ${variantList.length} Variants`}</span>
                              </button>
                            ) : null}

                            {isVariable && (
                              <button
                                type="button"
                                onClick={() => handleAddVariant(p.id)}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-gold hover:text-gold/80 hover:underline"
                              >
                                <Plus className="w-3 h-3" />
                                Add Variant
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-ivory-dark border border-border-warm">
                            {p.thumbnail && (
                              <Image src={p.thumbnail} alt={p.name} fill className="object-cover" sizes="40px" />
                            )}
                          </div>
                          <div>
                            <Link href={`/products/${p.slug}`} target="_blank" className="font-medium text-charcoal text-xs sm:text-sm hover:text-gold transition-colors">
                              {p.name}
                            </Link>
                            {isVariable && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandVariants(p.id)}
                                  className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                                >
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  <span>{variantList.length} variants</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 font-mono text-xs align-top">
                      {isBulkEditMode ? (
                        <input
                          type="text"
                          value={ed.sku}
                          onChange={(e) => handleCellChange(p.id, 'sku', e.target.value.toUpperCase())}
                          className="w-full border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal font-mono bg-white"
                        />
                      ) : (
                        <span className="text-charcoal-light font-mono font-medium">{p.sku}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-xs align-top">
                      {isBulkEditMode ? (
                        <select
                          value={ed.category}
                          onChange={(e) => handleCellChange(p.id, 'category', e.target.value)}
                          className="w-full border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-charcoal">{p.category}</span>
                      )}
                    </td>

                    {/* Type & Variants */}
                    <td className="px-4 py-3 text-xs align-top">
                      {isBulkEditMode ? (
                        <div className="space-y-1.5">
                          <select
                            value={isVariable ? 'variable' : 'simple'}
                            onChange={(e) => handleTypeChange(p.id, e.target.value as 'simple' | 'variable')}
                            className="w-full border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white font-medium"
                          >
                            <option value="simple">Simple</option>
                            <option value="variable">Variable</option>
                          </select>
                          {isVariable && (
                            <button
                              type="button"
                              onClick={() => handleAddVariant(p.id)}
                              className="text-[11px] text-amber-800 hover:underline font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add new variant
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isVariable 
                                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {isVariable ? 'Variable' : 'Simple'}
                            </span>
                            {isVariable && (
                              <span className="text-[11px] text-charcoal-light font-medium">
                                ({variantList.length})
                              </span>
                            )}
                          </div>
                          {p.option_types && p.option_types.length > 0 && (
                            <span className="text-[10px] text-charcoal-light leading-tight">
                              {p.option_types.map(o => `${o.name || o.type}: ${o.values.join(', ')}`).join(' | ')}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Regular Price (MRP) */}
                    <td className="px-4 py-3 text-xs align-top">
                      {isBulkEditMode ? (
                        <input
                          type="number"
                          value={ed.regular_price ?? ''}
                          onChange={(e) => handleCellChange(p.id, 'regular_price', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="MRP"
                          className="w-24 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white"
                        />
                      ) : (
                        p.regular_price ? <span className="line-through text-charcoal-light">₹{p.regular_price}</span> : <span className="text-charcoal-light">-</span>
                      )}
                    </td>

                    {/* Offer Price */}
                    <td className="px-4 py-3 text-xs font-medium align-top">
                      {isBulkEditMode ? (
                        <input
                          type="number"
                          value={ed.price ?? ''}
                          onChange={(e) => handleCellChange(p.id, 'price', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="Offer"
                          className="w-24 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white font-semibold"
                        />
                      ) : (
                        <PriceDisplay price={p.price} regularPrice={p.regular_price} currency={p.currency} size="sm" />
                      )}
                    </td>

                    {/* Availability */}
                    <td className="px-4 py-3 align-top">
                      {isBulkEditMode ? (
                        <select
                          value={ed.availability}
                          onChange={(e) => handleCellChange(p.id, 'availability', e.target.value as Availability)}
                          className="border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white"
                        >
                          <option value="available">Available</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="coming_soon">Coming Soon</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      ) : (
                        <AvailabilityBadge status={p.availability} />
                      )}
                    </td>

                    {/* Featured */}
                    <td className="px-4 py-3 text-center align-top">
                      {isBulkEditMode ? (
                        <input
                          type="checkbox"
                          checked={ed.featured}
                          onChange={(e) => handleCellChange(p.id, 'featured', e.target.checked)}
                          className="w-4 h-4 accent-gold cursor-pointer mt-1"
                        />
                      ) : (
                        p.featured ? <span className="text-gold text-xs font-semibold">★</span> : <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    {!isBulkEditMode && (
                      <td className="px-4 py-3 text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="p-1.5 text-charcoal-light hover:text-gold rounded-lg hover:bg-gold/10 transition-colors"
                            aria-label="Edit product"
                            title="Edit product & variants"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="p-1.5 text-charcoal-light hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            aria-label="Delete product"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded Variant Sub-Panels for Variable Products */}
      {Array.from(expandedVariantIds).map((prodId) => {
        const p = products.find(prod => prod.id === prodId);
        const ed = editedProducts[prodId] || p;
        if (!ed) return null;
        const variantList: InlineVariant[] = Array.isArray(ed.variants) ? ed.variants : [];

        return (
          <div key={`variants-panel-${prodId}`} className="bg-amber-50/70 border border-amber-300 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-charcoal">
                  Variants for: <span className="text-amber-900">{ed.name}</span>
                </h3>
                <span className="text-xs text-charcoal-light font-mono font-normal">
                  (Base SKU: {ed.sku})
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                  {variantList.length} {variantList.length === 1 ? 'variant' : 'variants'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Add Variant Button */}
                <button
                  type="button"
                  onClick={() => handleAddVariant(prodId)}
                  className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variant</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleExpandVariants(prodId)}
                  className="text-xs text-charcoal-light hover:text-charcoal flex items-center gap-1 border border-border-warm px-2.5 py-1.5 rounded-xl bg-white"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {variantList.length === 0 ? (
              <div className="text-center py-6 bg-white rounded-xl border border-dashed border-amber-300 p-4">
                <p className="text-xs text-charcoal-light mb-2">No variants created yet for this product.</p>
                <button
                  type="button"
                  onClick={() => handleAddVariant(prodId)}
                  className="inline-flex items-center gap-1.5 bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Variant
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-xs">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-amber-100/70 border-b border-amber-200">
                      <th className="py-2.5 px-3 text-left font-semibold text-charcoal-light min-w-[180px]">Variant Name / Option</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-charcoal-light min-w-[130px]">Variant SKU</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-charcoal-light min-w-[120px]">Barcode</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-charcoal-light min-w-[120px]">Price Override (₹)</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-charcoal-light min-w-[80px]">Stock</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-charcoal-light w-16">Active</th>
                      <th className="py-2.5 px-2 text-right w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {variantList.map((v, vIdx) => {
                      const thumb = v.images?.[0] || v.image;
                      const uploadKey = `${prodId}-${vIdx}`;
                      const isUploading = uploadingVariantKey === uploadKey;

                      return (
                        <tr key={v.sku || vIdx} className="hover:bg-amber-50/40">
                          {/* Name / Thumb */}
                          <td className="py-2.5 px-3 font-medium text-charcoal">
                            <div className="flex items-center gap-2">
                              {/* Thumbnail with photo upload trigger */}
                              <div className="relative group w-8 h-8 rounded-lg overflow-hidden border border-border-warm flex-shrink-0 bg-ivory">
                                {thumb ? (
                                  <img src={thumb} alt={v.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-charcoal-light">
                                    <ImagePlus className="w-3.5 h-3.5 opacity-60" />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => fileInputRefs.current[uploadKey]?.click()}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                                  title="Upload / Change variant photo"
                                >
                                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={(el) => { fileInputRefs.current[uploadKey] = el; }}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleVariantImageUpload(prodId, vIdx, e.target.files[0]);
                                    }
                                  }}
                                />
                              </div>

                              {isBulkEditMode ? (
                                <input
                                  type="text"
                                  value={v.name}
                                  onChange={(e) => {
                                    handleVariantCellChange(prodId, vIdx, 'name', e.target.value);
                                    const updatedOptVals = { ...(v.option_values || {}), Option: e.target.value };
                                    handleVariantCellChange(prodId, vIdx, 'option_values', updatedOptVals);
                                  }}
                                  placeholder="Option name (e.g. Red, XL)"
                                  className="w-36 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs bg-white font-medium"
                                />
                              ) : (
                                <span>{v.name}</span>
                              )}
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-2.5 px-3">
                            {isBulkEditMode ? (
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => handleVariantCellChange(prodId, vIdx, 'sku', e.target.value.toUpperCase())}
                                className="w-32 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs font-mono bg-white"
                              />
                            ) : (
                              <span className="font-mono text-charcoal">{v.sku}</span>
                            )}
                          </td>

                          {/* Barcode */}
                          <td className="py-2.5 px-3">
                            {isBulkEditMode ? (
                              <input
                                type="text"
                                value={v.barcode || ''}
                                onChange={(e) => handleVariantCellChange(prodId, vIdx, 'barcode', e.target.value)}
                                className="w-28 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs font-mono bg-white"
                                placeholder="Barcode"
                              />
                            ) : (
                              <span className="font-mono text-charcoal-light">{v.barcode || '-'}</span>
                            )}
                          </td>

                          {/* Price Override */}
                          <td className="py-2.5 px-3">
                            {isBulkEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={v.price_override ?? ''}
                                onChange={(e) => handleVariantCellChange(prodId, vIdx, 'price_override', e.target.value)}
                                placeholder={ed.price ? `Base: ₹${ed.price}` : 'Base'}
                                className="w-28 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs bg-white"
                              />
                            ) : (
                              v.price_override != null ? (
                                <span className="font-semibold text-charcoal">₹{v.price_override}</span>
                              ) : (
                                <span className="text-charcoal-light text-[11px]">(Inherits ₹{ed.price})</span>
                              )
                            )}
                          </td>

                          {/* Stock */}
                          <td className="py-2.5 px-3">
                            {isBulkEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={v.stock}
                                onChange={(e) => handleVariantCellChange(prodId, vIdx, 'stock', e.target.value)}
                                className="w-20 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs bg-white font-medium"
                              />
                            ) : (
                              <span className="font-medium text-charcoal">{v.stock}</span>
                            )}
                          </td>

                          {/* Active */}
                          <td className="py-2.5 px-3 text-center">
                            {isBulkEditMode ? (
                              <input
                                type="checkbox"
                                checked={v.is_active !== false}
                                onChange={(e) => handleVariantCellChange(prodId, vIdx, 'is_active', e.target.checked)}
                                className="w-4 h-4 accent-gold cursor-pointer"
                              />
                            ) : (
                              v.is_active !== false ? (
                                <span className="text-emerald-600 font-semibold text-xs">Yes</span>
                              ) : (
                                <span className="text-red-500 font-semibold text-xs">No</span>
                              )
                            )}
                          </td>

                          {/* Delete Variant */}
                          <td className="py-2.5 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(prodId, vIdx)}
                              className="text-charcoal-light hover:text-red-600 p-1 rounded transition-colors"
                              title="Delete this variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Bottom Add Variant trigger */}
                <div className="p-2 bg-amber-50/50 border-t border-amber-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAddVariant(prodId)}
                    className="flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 font-semibold hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Another Variant</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={load}
      />
    </div>
  );
}
