import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

const BASE_COLUMNS = new Set([
  'id', 'sku', 'name', 'slug', 'category', 'description', 'price', 'currency',
  'availability', 'images', 'thumbnail', 'featured', 'product_type', 'parent_sku',
  'color', 'regular_price', 'variant_type', 'has_variants', 'option_types', 'variants'
]);

function attachMetadata(prod: any) {
  if (!prod) return prod;
  if (prod.description && prod.description.includes('<!-- SC_META:')) {
    const match = prod.description.match(/<!-- SC_META:(.*?) -->/);
    if (match && match[1]) {
      try {
        const meta = JSON.parse(match[1]);
        return {
          ...meta,
          ...prod,
          barcode: prod.barcode ?? meta.barcode ?? null,
          categories: prod.categories ?? meta.categories ?? (prod.category ? [prod.category] : []),
          subcategories: prod.subcategories ?? meta.subcategories ?? [],
          jewelry_type: prod.jewelry_type ?? meta.jewelry_type ?? 'imitation',
          stock_quantity: prod.stock_quantity ?? meta.stock_quantity ?? 0,
          rack_number: prod.rack_number ?? meta.rack_number ?? null,
          box_number: prod.box_number ?? meta.box_number ?? null,
          slot_number: prod.slot_number ?? meta.slot_number ?? null,
          vendor_id: prod.vendor_id ?? meta.vendor_id ?? null,
          is_new_arrival: prod.is_new_arrival ?? meta.is_new_arrival ?? false,
          is_best_seller: prod.is_best_seller ?? meta.is_best_seller ?? prod.featured ?? false,
          size_chart_url: prod.size_chart_url ?? meta.size_chart_url ?? null,
          price_includes_shipping: prod.price_includes_shipping ?? meta.price_includes_shipping ?? false,
          description: prod.description.replace(/<!-- SC_META:.*? -->/, '').trim(),
        };
      } catch {
        // ignore parse error
      }
    }
  }
  return prod;
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const showHidden = searchParams.get('all') === '1';

  let query = supabase.from('products').select('*').order('created_at', { ascending: false });

  if (!showHidden) {
    query = query.neq('availability', 'hidden');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const mapped = Array.isArray(data) ? data.map(attachMetadata) : [];
  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  // Try direct insert first (if migrations applied)
  let { data, error } = await supabase.from('products').insert(body).select().single();

  if (error && (error.message.includes('schema cache') || error.message.includes('does not exist'))) {
    // Graceful fallback: pack extended attributes into description comment
    const extraAttrs = {
      barcode: body.barcode,
      categories: body.categories,
      subcategories: body.subcategories,
      jewelry_type: body.jewelry_type,
      stock_quantity: body.stock_quantity,
      rack_number: body.rack_number,
      box_number: body.box_number,
      slot_number: body.slot_number,
      vendor_id: body.vendor_id,
      is_new_arrival: body.is_new_arrival,
      is_best_seller: body.is_best_seller,
      size_chart_url: body.size_chart_url,
      price_includes_shipping: body.price_includes_shipping,
    };

    const cleanDesc = (body.description || '').replace(/<!-- SC_META:.*? -->/, '').trim();
    const updatedDesc = `${cleanDesc}\n\n<!-- SC_META:${JSON.stringify(extraAttrs)} -->`.trim();

    const fallbackPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      if (BASE_COLUMNS.has(k)) {
        fallbackPayload[k] = v;
      }
    }
    fallbackPayload.description = updatedDesc;

    const retry = await supabase.from('products').insert(fallbackPayload).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(attachMetadata(data), { status: 201 });
}
