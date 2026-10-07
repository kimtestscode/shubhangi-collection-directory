import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import { COURIER_META, CourierPartner } from '@/lib/shipping';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Update shipping record (courier, tracking ID, photo, whatsapp_sent status, notes)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};

  if (typeof body.courier_partner !== 'undefined') {
    updates.courier_partner = body.courier_partner || null;
  }

  if (typeof body.tracking_number !== 'undefined') {
    const docket = typeof body.tracking_number === 'string' ? body.tracking_number.trim() : null;
    updates.tracking_number = docket;

    // Automatically compute tracking URL if not explicitly given
    if (body.courier_partner && docket) {
      const partnerMeta = COURIER_META[body.courier_partner as CourierPartner];
      if (partnerMeta) {
        updates.tracking_url = partnerMeta.getTrackingUrl(docket);
      }
    }
  }

  if (typeof body.tracking_url !== 'undefined') {
    updates.tracking_url = typeof body.tracking_url === 'string' ? body.tracking_url.trim() : null;
  }

  if (typeof body.docket_photo_url !== 'undefined') {
    updates.docket_photo_url = typeof body.docket_photo_url === 'string' ? body.docket_photo_url.trim() : null;
  }

  if (typeof body.whatsapp_sent === 'boolean') {
    updates.whatsapp_sent = body.whatsapp_sent;
    updates.whatsapp_sent_at = body.whatsapp_sent ? new Date().toISOString() : null;
  }

  if (typeof body.status === 'string') {
    updates.status = body.status;
  } else if (updates.tracking_number) {
    // If tracking number was added, promote status to dispatched
    updates.status = 'dispatched';
  }

  if (typeof body.customer_name === 'string') {
    updates.customer_name = body.customer_name.trim();
  }

  if (typeof body.customer_mobile === 'string') {
    updates.customer_mobile = body.customer_mobile.trim();
  }

  if (typeof body.notes !== 'undefined') {
    updates.notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('shipping_master')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Undo a mistaken scan / delete entry
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized();

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('shipping_master').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
