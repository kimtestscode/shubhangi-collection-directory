'use client';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/lib/utils';
import { CategoryItem } from '@/lib/types';

interface Props {
  selected: string;
  onChange: (c: string) => void;
}

export default function CategoryFilter({ selected, onChange }: Props) {
  const [categories, setCategories] = useState<string[]>(CATEGORIES);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = ['All', ...data.map((c: CategoryItem) => c.name)];
          setCategories(names);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`text-sm px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
            selected === cat
              ? 'bg-gold border-gold text-white font-medium shadow-xs'
              : 'border-border-warm text-charcoal-light hover:border-gold hover:text-gold bg-white'
          }`}
          aria-pressed={selected === cat}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
