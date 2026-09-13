import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function PUT(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { products } = await req.json();

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No products provided for bulk update' }, { status: 400 });
    }

    const cleanProducts = products.map((p) => ({
      ...p,
      price: p.price !== undefined && p.price !== null && String(p.price).trim() !== '' ? Number(p.price) : null,
      regular_price: p.regular_price !== undefined && p.regular_price !== null && String(p.regular_price).trim() !== '' ? Number(p.regular_price) : null,
      parent_sku: p.parent_sku || null,
      color: p.color || null,
    }));

    const { data, error } = await supabase
      .from('products')
      .upsert(cleanProducts, { onConflict: 'id' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data ? data.length : cleanProducts.length,
      products: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk update failed' }, { status: 500 });
  }
}
