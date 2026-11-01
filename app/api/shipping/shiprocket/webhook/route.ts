import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

/**
 * Shiprocket Webhook Receiver for live tracking & delivery updates.
 * Configure in Shiprocket Settings > Webhooks > Tracking Events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const awb = body.awb || body.awb_code;
    const orderId = body.order_id || body.order_number;
    const rawStatus = String(body.current_status || body.status || '').toUpperCase();
    const location = body.location || body.scans?.[0]?.location || '';
    const activity = body.activity || body.scans?.[0]?.activity || rawStatus;

    if (!awb && !orderId) {
      return NextResponse.json({ error: 'Missing awb or order_id in webhook' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let query = supabase.from('shipping_master').select('*');
    if (awb) {
      query = query.eq('tracking_number', String(awb).trim());
    } else {
      query = query.eq('order_number', String(orderId).trim());
    }

    const { data: existing } = await query.maybeSingle();

    if (!existing) {
      return NextResponse.json({ received: true, note: 'Shipment not found in database' });
    }

    let nextStatus = existing.status;
    if (rawStatus.includes('DELIVERED')) {
      nextStatus = 'delivered';
    } else if (rawStatus.includes('OUT FOR DELIVERY')) {
      nextStatus = 'out_for_delivery';
    } else if (
      rawStatus.includes('IN TRANSIT') ||
      rawStatus.includes('PICKED UP') ||
      rawStatus.includes('REACHED') ||
      rawStatus.includes('SHIPPED')
    ) {
      nextStatus = 'in_transit';
    } else if (rawStatus.includes('RTO') || rawStatus.includes('UNDELIVERED')) {
      nextStatus = 'rto';
    }

    let notes = existing.notes || '';
    if (activity) {
      const loc = location ? ` (${location})` : '';
      const summary = `${rawStatus}: ${activity}${loc}`;
      if (notes.startsWith('Shiprocket:')) {
        const prefix = notes.split('|')[0].trim();
        notes = `${prefix} | ${summary}`;
      } else {
        notes = summary;
      }
    }

    const updatePayload: Record<string, any> = {
      status: nextStatus,
      notes,
    };

    if (nextStatus === 'delivered') {
      updatePayload.partner_submitted_at = new Date().toISOString();
    }

    await supabase.from('shipping_master').update(updatePayload).eq('id', existing.id);

    return NextResponse.json({ success: true, order_number: existing.order_number, status: nextStatus });
  } catch (err: any) {
    console.error('Shiprocket webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
