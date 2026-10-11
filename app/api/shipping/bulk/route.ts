import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import { normalizeOrderNumber } from '@/lib/shipping';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const action = body.action; // 'update_dates' | 'delete_entries' | 'clear_addresses'
  const supabase = createAdminClient();

  // ─── 1. BULK UPDATE DATES ────────────────────────────────────────────────
  if (action === 'update_dates') {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    const orderNumbers: string[] = Array.isArray(body.order_numbers)
      ? body.order_numbers.map((n: string) => normalizeOrderNumber(String(n))).filter(Boolean)
      : [];

    const rawShippedAt = typeof body.shipped_at === 'string' ? body.shipped_at : new Date().toISOString();
    const parsed = new Date(rawShippedAt);
    const pickupIso = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
    const handedTo = typeof body.handed_to === 'string' && body.handed_to.trim() ? body.handed_to.trim() : null;

    let updatedCount = 0;
    const updatedEntries: any[] = [];

    // Case A: Update by specific IDs
    if (ids.length > 0) {
      const updatePayload: Record<string, any> = {
        shipped_at: pickupIso,
      };
      if (handedTo) updatePayload.handed_to = handedTo;

      // Also set status to picked_up if it was pending
      const { data, error } = await supabase
        .from('shipping_master')
        .update(updatePayload)
        .in('id', ids)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      updatedCount += data?.length || 0;
      if (data) updatedEntries.push(...data);
    }

    // Case B: Update by order numbers (e.g. from Batch Scanner / Barcode list)
    if (orderNumbers.length > 0) {
      // Find existing orders
      const { data: existing, error: existingError } = await supabase
        .from('shipping_master')
        .select('*')
        .in('order_number', orderNumbers);

      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

      const existingMap = new Map((existing || []).map((e) => [e.order_number, e]));
      const existingIdsToUpdate: string[] = [];
      const newOrdersToInsert: string[] = [];

      for (const num of orderNumbers) {
        if (existingMap.has(num)) {
          existingIdsToUpdate.push(existingMap.get(num).id);
        } else {
          newOrdersToInsert.push(num);
        }
      }

      if (existingIdsToUpdate.length > 0) {
        const updatePayload: Record<string, any> = { shipped_at: pickupIso };
        if (handedTo) updatePayload.handed_to = handedTo;

        const { data: updatedExisting } = await supabase
          .from('shipping_master')
          .update(updatePayload)
          .in('id', existingIdsToUpdate)
          .select();

        if (updatedExisting) {
          updatedCount += updatedExisting.length;
          updatedEntries.push(...updatedExisting);
        }
      }

      if (newOrdersToInsert.length > 0) {
        const inserts = newOrdersToInsert.map((num) => ({
          order_number: num,
          status: 'picked_up',
          shipped_at: pickupIso,
          handed_to: handedTo,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('shipping_master')
          .insert(inserts)
          .select();

        if (!insertError && inserted) {
          updatedCount += inserted.length;
          updatedEntries.push(...inserted);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: updatedCount,
      updated: updatedEntries,
      shipped_at: pickupIso,
    });
  }

  // ─── 2. BULK DELETE ENTRIES ──────────────────────────────────────────────
  if (action === 'delete_entries') {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No order IDs specified for deletion' }, { status: 400 });
    }

    const { error, count } = await supabase
      .from('shipping_master')
      .delete()
      .in('id', ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: count ?? ids.length });
  }

  // ─── 3. BULK CLEAR / DELETE ADDRESSES ────────────────────────────────────
  if (action === 'clear_addresses') {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No order IDs specified' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shipping_master')
      .update({
        customer_address: null,
        customer_city: null,
        customer_pincode: null,
      })
      .in('id', ids)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: data?.length ?? ids.length, updated: data });
  }

  return NextResponse.json({ error: `Unknown bulk action: ${action}` }, { status: 400 });
}
