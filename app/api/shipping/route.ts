import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import { normalizeOrderNumber } from '@/lib/shipping';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// List the shipping master (newest first)
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('shipping_master')
    .select('*')
    .order('shipped_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Record a scan. Idempotent: scanning an already-shipped order returns the original entry.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const orderNumber = normalizeOrderNumber(String(body.order_number ?? ''));
  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
  }
  const handedTo = typeof body.handed_to === 'string' && body.handed_to.trim() ? body.handed_to.trim() : null;

  const supabase = createAdminClient();

  const existing = await supabase
    .from('shipping_master')
    .select('*')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (existing.data) return NextResponse.json({ status: 'duplicate', entry: existing.data });

  const { data, error } = await supabase
    .from('shipping_master')
    .insert({ order_number: orderNumber, handed_to: handedTo })
    .select()
    .single();

  if (error) {
    // Two scans racing each other: the unique constraint wins, report as duplicate.
    if (error.code === '23505') {
      const again = await supabase.from('shipping_master').select('*').eq('order_number', orderNumber).single();
      if (again.data) return NextResponse.json({ status: 'duplicate', entry: again.data });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'created', entry: data }, { status: 201 });
}
