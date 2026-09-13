import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

export async function GET() {
  const supabase = createAdminClient();

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 });
  }

  const { data: products } = await supabase.from('products').select('category');

  const counts: Record<string, number> = {};
  if (products) {
    for (const p of products) {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    }
  }

  const result = categories.map((c) => ({
    ...c,
    product_count: counts[c.name] || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const { name } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }

  const trimmedName = name.trim();
  const slug = slugify(trimmedName);

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: trimmedName, slug })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
