'use client';
import { useEffect, useState } from 'react';
import { Tags, Plus, Edit, Trash2, Loader2, FolderTree } from 'lucide-react';
import { CategoryItem } from '@/lib/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreating(true);
    setError('');

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim() }),
    });

    if (res.ok) {
      setNewCatName('');
      load();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add category.');
    }
    setCreating(false);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;

    setSaving(true);
    setError('');

    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });

    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to update category.');
    }
    setSaving(false);
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (cat.product_count && cat.product_count > 0) {
      if (!confirm(`"${cat.name}" has ${cat.product_count} products. Are you sure you want to delete this category?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete category "${cat.name}"?`)) return;
    }

    setDeletingId(cat.id);
    await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
    setDeletingId(null);
    load();
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Tags className="w-7 h-7 text-gold" />
            <h1 className="font-serif text-3xl text-charcoal font-semibold">Categories</h1>
          </div>
          <p className="text-charcoal-light text-sm mt-1">
            Manage your jewellery categories. Categories are displayed across your public catalogue and filter section.
          </p>
        </div>
      </div>

      {/* Add New Category Card */}
      <div className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-charcoal mb-4">Add New Category</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Traditional Payal, Nose Rings, Hair Accessories"
            className="flex-1 border border-border-warm rounded-xl px-4 py-2.5 text-sm text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 bg-white"
          />
          <button
            type="submit"
            disabled={creating || !newCatName.trim()}
            className="flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Category
          </button>
        </form>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {/* Categories Table / List */}
      <div className="bg-white rounded-2xl border border-border-warm overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-warm bg-ivory-dark flex items-center justify-between">
          <span className="font-serif font-semibold text-charcoal text-base">Existing Categories</span>
          <span className="text-xs text-charcoal-light font-medium">{categories.length} Total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-charcoal-light">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />
            <span className="text-sm">Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-charcoal-light">
            <FolderTree className="w-10 h-10 text-border-warm mx-auto mb-2" />
            <p className="text-sm">No categories created yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-warm">
            {categories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-4 hover:bg-ivory/50 transition-colors">
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-gold rounded-lg px-3 py-1.5 text-sm text-charcoal bg-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={saving}
                      className="bg-gold text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gold/90 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="border border-border-warm text-charcoal-light text-xs font-medium px-3 py-1.5 rounded-lg hover:text-charcoal transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-charcoal text-sm sm:text-base">{cat.name}</span>
                      <span className="text-xs text-charcoal-light font-mono bg-ivory-dark px-2 py-0.5 rounded border border-border-warm">
                        /{cat.slug}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium text-charcoal-light bg-ivory-dark px-2.5 py-1 rounded-full border border-border-warm">
                        {cat.product_count} {cat.product_count === 1 ? 'Product' : 'Products'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-charcoal-light hover:text-gold rounded-lg hover:bg-gold/10 transition-colors"
                          aria-label="Edit Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          className="p-1.5 text-charcoal-light hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          aria-label="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
