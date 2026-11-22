import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import { trackShiprocketAWB, fetchShiprocketRecentOrdersWithAwbs } from '@/lib/shiprocket';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createAdminClient();

    // ─── PHASE 1: Sync Any Unlinked Pending Orders from Live Shiprocket ─────────
    let newlyLinkedCount = 0;
    try {
      const liveShiprocketOrders = await fetchShiprocketRecentOrdersWithAwbs(150);
      if (liveShiprocketOrders.length > 0) {
        const orderNumbers = liveShiprocketOrders.map((o) => o.order_number);
        const { data: matchedRows } = await supabase
          .from('shipping_master')
          .select('id, order_number, tracking_number, status')
          .in('order_number', orderNumbers);

        if (matchedRows && matchedRows.length > 0) {
          for (const local of matchedRows) {
            const isUnlinked =
              !local.tracking_number ||
              local.tracking_number.trim() === '' ||
              local.status === 'pending';

            if (isUnlinked) {
              const sr = liveShiprocketOrders.find((o) => o.order_number === local.order_number);
              if (sr && sr.awb) {
                let trackingUrl = '';
                if (/delhivery/i.test(sr.courier)) {
                  trackingUrl = `https://www.delhivery.com/track/package/${sr.awb}`;
                } else if (/dtdc/i.test(sr.courier)) {
                  trackingUrl = `https://www.dtdc.in/tracking/tracking_results.asp?trCode=${sr.awb}`;
                } else if (/xpressbees/i.test(sr.courier)) {
                  trackingUrl = `https://www.xpressbees.com/shipment/tracking?awb=${sr.awb}`;
                } else {
                  trackingUrl = `https://shiprocket.co/tracking/${sr.awb}`;
                }

                let localStatus = 'picked_up';
                const srStat = (sr.status || '').toUpperCase();
                if (srStat.includes('DELIVERED')) localStatus = 'delivered';
                else if (srStat.includes('OUT FOR DELIVERY')) localStatus = 'out_for_delivery';
                else if (srStat.includes('RTO')) localStatus = 'rto';

                await supabase
                  .from('shipping_master')
                  .update({
                    status: localStatus,
                    tracking_number: sr.awb,
                    tracking_url: trackingUrl,
                    courier_partner: 'other',
                    notes: `Shiprocket: ${sr.courier}`,
                    shiprocket_shipment_id: sr.shipment_id,
                  })
                  .eq('id', local.id);

                newlyLinkedCount++;
              }
            }
          }
        }
      }
    } catch (phase1Err) {
      console.warn('Phase 1 Shiprocket orders sync warning:', phase1Err);
    }

    // ─── PHASE 2: Live Tracking Updates for Active Shipments with AWBs ─────────
    let query = supabase
      .from('shipping_master')
      .select('id, order_number, tracking_number, status, notes, courier_partner')
      .not('tracking_number', 'is', null)
      .neq('status', 'delivered');

    if (Array.isArray(body.order_numbers) && body.order_numbers.length > 0) {
      query = query.in('order_number', body.order_numbers);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      query = query.in('id', body.ids);
    } else {
      // Query recent active shipments (up to 50)
      query = query.order('created_at', { ascending: false }).limit(50);
    }

    const { data: shipments, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active shipments found to track.',
        checked: 0,
        updated: 0,
        results: [],
      });
    }

    let updatedCount = 0;
    const results: any[] = [];

    // Process in batches of 5 concurrent calls
    for (let i = 0; i < shipments.length; i += 5) {
      const batch = shipments.slice(i, i + 5);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.tracking_number) return;
          const track = await trackShiprocketAWB(item.tracking_number);
          if (!track) return;

          const rawStatus = track.current_status.toUpperCase();
          let newStatus = item.status;

          if (rawStatus.includes('DELIVERED')) {
            newStatus = 'delivered';
          } else if (rawStatus.includes('OUT FOR DELIVERY')) {
            newStatus = 'out_for_delivery';
          } else if (
            rawStatus.includes('IN TRANSIT') ||
            rawStatus.includes('PICKED UP') ||
            rawStatus.includes('REACHED') ||
            rawStatus.includes('SHIPPED')
          ) {
            newStatus = 'in_transit';
          } else if (rawStatus.includes('RTO') || rawStatus.includes('UNDELIVERED')) {
            newStatus = 'rto';
          }

          // Build clean notes with latest scan activity if available
          let notes = item.notes || '';
          if (track.activity) {
            const loc = track.location ? ` (${track.location})` : '';
            const statusSummary = `${track.current_status}: ${track.activity}${loc}`;
            if (notes.startsWith('Shiprocket:')) {
              const courierPart = notes.split('|')[0].trim();
              notes = `${courierPart} | ${statusSummary}`;
            } else {
              notes = statusSummary;
            }
          }

          if (newStatus !== item.status || notes !== item.notes) {
            const updatePayload: Record<string, any> = {
              status: newStatus,
              notes,
            };
            if (newStatus === 'delivered' && track.delivered_date) {
              updatePayload.partner_submitted_at = track.delivered_date;
            }
            await supabase.from('shipping_master').update(updatePayload).eq('id', item.id);
            updatedCount++;
          }

          results.push({
            order_number: item.order_number,
            awb: item.tracking_number,
            old_status: item.status,
            new_status: newStatus,
            current_status: track.current_status,
            activity: track.activity,
            location: track.location,
          });
        })
      );
    }

    return NextResponse.json({
      success: true,
      newly_linked_awbs: newlyLinkedCount,
      checked: shipments.length,
      updated: updatedCount,
      results,
    });
  } catch (err: any) {
    console.error('Shiprocket tracking sync error:', err);
    return NextResponse.json({ error: err.message || 'Tracking sync failed' }, { status: 500 });
  }
}

