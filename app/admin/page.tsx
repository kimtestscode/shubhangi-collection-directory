'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2, AlertCircle, Download, Upload, SlidersHorizontal, Save, X, Check, Loader2, CheckSquare, Square } from 'lucide-react';
import { Product, ProductType, Availability, CategoryItem } from '@/lib/types';
import { exportProductsToCSV } from '@/lib/csv';
import { CATEGORIES } from '@/lib/utils';
import AvailabilityBadge from '@/components/shared/AvailabilityBadge';
import CSVImportModal from '@/components/admin/CSVImportModal';
import PriceDisplay from '@/components/shared/PriceDisplay';

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
  const [bulkSaving, setBulkSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

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

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const p of products) {
      const ed = editedProducts[p.id];
      if (!ed) continue;
      if (
        ed.name !== p.name ||
        ed.sku !== p.sku ||
        ed.category !== p.category ||
        ed.price !== p.price ||
        ed.regular_price !== p.regular_price ||
        ed.availability !== p.availability ||
        ed.product_type !== p.product_type ||
        ed.color !== p.color ||
        ed.featured !== p.featured
      ) {
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

    if (['available', 'out_of_stock', 'coming_soon', 'hidden'].includes(bulkAction)) {
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
      if (!ed) continue;
      if (
        ed.name !== p.name ||
        ed.sku !== p.sku ||
        ed.category !== p.category ||
        ed.price !== p.price ||
        ed.regular_price !== p.regular_price ||
        ed.availability !== p.availability ||
        ed.product_type !== p.product_type ||
        ed.color !== p.color ||
        ed.featured !== p.featured
      ) {
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
          {/* WordPress-style Bulk Editor Toggle */}
          <button
            onClick={() => {
              if (isBulkEditMode) handleDiscardBulkChanges();
              setIsBulkEditMode(!isBulkEditMode);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              isBulkEditMode
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                : 'border border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isBulkEditMode ? 'Bulk Editor (Active)' : 'Bulk Editor'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 border border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 border border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-charcoal/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Bulk Editor Toolbar (When Active) */}
      {isBulkEditMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider bg-amber-200/70 px-2.5 py-1 rounded">
              WordPress Bulk Mode
            </span>

            {/* Bulk Selection Action */}
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                disabled={selectedIds.size === 0}
                className="border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-charcoal bg-white focus:outline-none disabled:opacity-50"
              >
                <option value="">Bulk Actions ({selectedIds.size} selected)...</option>
                <optgroup label="Set Availability">
                  <option value="available">Set to Available</option>
                  <option value="out_of_stock">Set to Out of Stock</option>
                  <option value="coming_soon">Set to Coming Soon</option>
                  <option value="hidden">Set to Hidden</option>
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
                {modifiedCount} {modifiedCount === 1 ? 'change' : 'changes'} pending
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
                <th className="px-4 py-3 text-charcoal-light font-medium min-w-[130px]">Type / Color</th>
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
                const isChanged = isBulkEditMode && (
                  ed.name !== p.name ||
                  ed.sku !== p.sku ||
                  ed.category !== p.category ||
                  ed.price !== p.price ||
                  ed.regular_price !== p.regular_price ||
                  ed.availability !== p.availability ||
                  ed.product_type !== p.product_type ||
                  ed.color !== p.color ||
                  ed.featured !== p.featured
                );

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isChanged ? 'bg-amber-50/70 border-l-4 border-amber-400' : 'hover:bg-ivory/50'
                    }`}
                  >
                    {/* Checkbox */}
                    {isBulkEditMode && (
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          className="w-4 h-4 accent-gold cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Name */}
                    <td className="px-4 py-3">
                      {isBulkEditMode ? (
                        <input
                          type="text"
                          value={ed.name}
                          onChange={(e) => handleCellChange(p.id, 'name', e.target.value)}
                          className="w-full border border-border-warm focus:border-gold rounded-lg px-2.5 py-1.5 text-xs text-charcoal bg-white"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-ivory-dark border border-border-warm">
                            {p.thumbnail && (
                              <Image src={p.thumbnail} alt={p.name} fill className="object-cover" sizes="36px" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal text-xs sm:text-sm">{p.name}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 font-mono text-xs">
                      {isBulkEditMode ? (
                        <input
                          type="text"
                          value={ed.sku}
                          onChange={(e) => handleCellChange(p.id, 'sku', e.target.value.toUpperCase())}
                          className="w-full border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal font-mono bg-white"
                        />
                      ) : (
                        <span className="text-charcoal-light">{p.sku}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-xs">
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

                    {/* Type & Color */}
                    <td className="px-4 py-3 text-xs">
                      {isBulkEditMode ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={ed.product_type}
                            onChange={(e) => handleCellChange(p.id, 'product_type', e.target.value as ProductType)}
                            className="border border-border-warm focus:border-gold rounded-lg px-1.5 py-1 text-[11px] text-charcoal bg-white"
                          >
                            <option value="simple">Simple</option>
                            <option value="variable">Variable</option>
                            <option value="variation">Variation</option>
                          </select>
                          <input
                            type="text"
                            value={ed.color || ''}
                            placeholder="Color"
                            onChange={(e) => handleCellChange(p.id, 'color', e.target.value)}
                            className="w-20 border border-border-warm focus:border-gold rounded-lg px-1.5 py-1 text-[11px] text-charcoal bg-white"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            p.product_type === 'variable' ? 'bg-amber-100 text-amber-800' :
                            p.product_type === 'variation' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {p.product_type || 'simple'}
                          </span>
                          {p.color && (
                            <span className="text-[11px] text-charcoal font-medium bg-ivory-dark px-1.5 py-0.5 rounded border border-border-warm">
                              {p.color}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Regular Price (MRP) */}
                    <td className="px-4 py-3 text-xs">
                      {isBulkEditMode ? (
                        <input
                          type="number"
                          value={ed.regular_price ?? ''}
                          onChange={(e) => handleCellChange(p.id, 'regular_price', e.target.value)}
                          placeholder="MRP"
                          className="w-24 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white"
                        />
                      ) : (
                        p.regular_price ? <span className="line-through text-charcoal-light">₹{p.regular_price}</span> : <span className="text-charcoal-light">-</span>
                      )}
                    </td>

                    {/* Offer Price */}
                    <td className="px-4 py-3 text-xs font-medium">
                      {isBulkEditMode ? (
                        <input
                          type="number"
                          value={ed.price ?? ''}
                          onChange={(e) => handleCellChange(p.id, 'price', e.target.value)}
                          placeholder="Offer"
                          className="w-24 border border-border-warm focus:border-gold rounded-lg px-2 py-1 text-xs text-charcoal bg-white"
                        />
                      ) : (
                        <PriceDisplay price={p.price} regularPrice={p.regular_price} currency={p.currency} size="sm" />
                      )}
                    </td>

                    {/* Availability */}
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-center">
                      {isBulkEditMode ? (
                        <input
                          type="checkbox"
                          checked={ed.featured}
                          onChange={(e) => handleCellChange(p.id, 'featured', e.target.checked)}
                          className="w-4 h-4 accent-gold cursor-pointer"
                        />
                      ) : (
                        p.featured ? <span className="text-gold text-xs font-semibold">★</span> : <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    {!isBulkEditMode && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="p-1.5 text-charcoal-light hover:text-gold rounded-lg hover:bg-gold/10 transition-colors"
                            aria-label="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="p-1.5 text-charcoal-light hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            aria-label="Delete product"
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

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={load}
      />
    </div>
  );
}
