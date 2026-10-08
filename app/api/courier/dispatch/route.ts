import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isCourierRequest } from '@/lib/courierAuth';
import { COURIER_META, CourierPartner, normalizeOrderNumber } from '@/lib/shipping';

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized. Please login with PIN.' }, { status: 401 });

// Get parcels awaiting hub dispatch & today's tally
export async function GET(req: NextRequest) {
  if (!isCourierRequest(req)) return unauthorized();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('shipping_master')
    .select('*')
    .in('status', ['picked_up', 'dispatched'])
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

// Log a parcel at the courier hub with photo, courier company, docket & shipping cost
export async function POST(req: NextRequest) {
  if (!isCourierRequest(req)) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const supabase = createAdminClient();

  const orderId = body.order_id ? String(body.order_id) : null;
  const orderNumber = body.order_number ? normalizeOrderNumber(String(body.order_number)) : null;
  const courierPartner = body.courier_partner as CourierPartner;
  const trackingNumber = body.tracking_number ? String(body.tracking_number).trim() : '';
  const shippingCost = typeof body.shipping_cost !== 'undefined' && body.shipping_cost !== ''
    ? Number(body.shipping_cost)
    : null;
  const docketPhotoUrl = body.docket_photo_url ? String(body.docket_photo_url).trim() : null;

  if (!orderId && !orderNumber) {
    return NextResponse.json({ error: 'Order ID or Order Number is required' }, { status: 400 });
  }

  if (!courierPartner) {
    return NextResponse.json({ error: 'Please select a Courier Partner (कुरिअर कंपनी निवडा)' }, { status: 400 });
  }

  const partnerMeta = COURIER_META[courierPartner];
  const trackingUrl = partnerMeta ? partnerMeta.getTrackingUrl(trackingNumber) : '';
  const nowIso = new Date().toISOString();

  // Find target entry
  let query = supabase.from('shipping_master').select('*');
  if (orderId) {
    query = query.eq('id', orderId);
  } else if (orderNumber) {
    query = query.eq('order_number', orderNumber);
  }

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });

  if (existing) {
    // Update existing order with hub dispatch info
    const { data: updated, error: updateError } = await supabase
      .from('shipping_master')
      .update({
        status: 'dispatched',
        courier_partner: courierPartner,
        tracking_number: trackingNumber || existing.tracking_number,
        tracking_url: trackingUrl || existing.tracking_url,
        shipping_cost: shippingCost ?? existing.shipping_cost,
        docket_photo_url: docketPhotoUrl || existing.docket_photo_url,
        partner_submitted_at: nowIso,
        shipped_at: existing.shipped_at || nowIso,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, entry: updated });
  }

  // If order was not in system before, insert new row directly
  const { data: inserted, error: insertError } = await supabase
    .from('shipping_master')
    .insert({
      order_number: orderNumber!,
      status: 'dispatched',
      courier_partner: courierPartner,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      shipping_cost: shippingCost,
      docket_photo_url: docketPhotoUrl,
      partner_submitted_at: nowIso,
      shipped_at: nowIso,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ success: true, entry: inserted }, { status: 201 });
}
