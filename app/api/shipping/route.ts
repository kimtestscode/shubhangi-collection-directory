import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import { normalizeOrderNumber, COURIER_META, CourierPartner } from '@/lib/shipping';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// List shipping master records (newest first)
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('shipping_master')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// Record a scan OR sync printed orders
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const supabase = createAdminClient();

  // ─── ACTION: Bulk sync orders from Address Printer with QR ───────────────
  if (body.action === 'sync_orders' && Array.isArray(body.orders)) {
    const orders = body.orders;
    if (orders.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let syncedCount = 0;
    const nowIso = new Date().toISOString();

    for (const rawOrder of orders) {
      const orderNo = normalizeOrderNumber(String(rawOrder.orderNumber || rawOrder.order_number || ''));
      if (!orderNo) continue;

      const to = rawOrder.to || {};
      const customerName = to.name?.trim() || rawOrder.customer_name?.trim() || null;
      const customerMobile = to.mobile?.trim() || rawOrder.customer_mobile?.trim() || null;
      const customerAddress = to.address?.trim() || rawOrder.customer_address?.trim() || null;
      const customerCity = to.city?.trim() || rawOrder.customer_city?.trim() || null;
      const customerPincode = to.pincode?.trim() || rawOrder.customer_pincode?.trim() || null;

      // Check existing entry
      const { data: existing } = await supabase
        .from('shipping_master')
        .select('*')
        .eq('order_number', orderNo)
        .maybeSingle();

      if (existing) {
        // Only update customer details if missing, without altering existing shipping/dispatch status
        const updates: Record<string, unknown> = {};
        if (!existing.customer_name && customerName) updates.customer_name = customerName;
        if (!existing.customer_mobile && customerMobile) updates.customer_mobile = customerMobile;
        if (!existing.customer_address && customerAddress) updates.customer_address = customerAddress;
        if (!existing.customer_city && customerCity) updates.customer_city = customerCity;
        if (!existing.customer_pincode && customerPincode) updates.customer_pincode = customerPincode;
        if (!existing.printed_at) updates.printed_at = nowIso;

        if (Object.keys(updates).length > 0) {
          await supabase.from('shipping_master').update(updates).eq('id', existing.id);
        }
      } else {
        // Insert new pending order
        await supabase.from('shipping_master').insert({
          order_number: orderNo,
          status: 'pending',
          customer_name: customerName,
          customer_mobile: customerMobile,
          customer_address: customerAddress,
          customer_city: customerCity,
          customer_pincode: customerPincode,
          printed_at: nowIso,
          shipped_at: null,
          handed_to: null,
        });
      }
      syncedCount++;
    }

    return NextResponse.json({ status: 'synced', count: syncedCount });
  }

  // ─── ACTION: Scan / Mark order picked up ─────────────────────────────────
  const orderNumber = normalizeOrderNumber(String(body.order_number ?? ''));
  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
  }
  const handedTo = typeof body.handed_to === 'string' && body.handed_to.trim() ? body.handed_to.trim() : null;

  const { data: existing, error: existingError } = await supabase
    .from('shipping_master')
    .select('*')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const nowIso = new Date().toISOString();

  if (existing) {
    // If order is currently pending pickup, scanning marks it picked_up!
    if (existing.status === 'pending' || !existing.shipped_at) {
      const { data: updated, error: updateError } = await supabase
        .from('shipping_master')
        .update({
          status: 'picked_up',
          shipped_at: nowIso,
          handed_to: handedTo ?? existing.handed_to,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      return NextResponse.json({ status: 'created', entry: updated });
    }

    // Already picked up or dispatched
    return NextResponse.json({ status: 'duplicate', entry: existing });
  }

  // Not previously in system (e.g. ad-hoc scan directly at pickup)
  const { data, error } = await supabase
    .from('shipping_master')
    .insert({
      order_number: orderNumber,
      status: 'picked_up',
      shipped_at: nowIso,
      handed_to: handedTo,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: again } = await supabase.from('shipping_master').select('*').eq('order_number', orderNumber).single();
      if (again) return NextResponse.json({ status: 'duplicate', entry: again });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'created', entry: data }, { status: 201 });
}
