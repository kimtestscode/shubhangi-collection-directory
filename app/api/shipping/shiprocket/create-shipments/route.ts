import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  createShiprocketOrder,
  assignShiprocketAWB,
  generateShiprocketLabel,
  generateShiprocketManifest,
  requestShiprocketPickup,
  findShiprocketOrderByNumber,
} from '@/lib/shiprocket';
import { cropShiprocketPdfToA4, tileManifestPdfs } from '@/lib/crop-labels';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const orders: Array<{
      order_number: string;
      customer_name: string;
      customer_address: string;
      customer_city: string;
      customer_pincode: string;
      customer_state?: string;
      customer_mobile: string;
      courier_company_id?: number;
      declared_value?: number;
      weight_kg?: number;
      dimensions_cm?: { length: number; breadth: number; height: number };
    }> = body.orders || [];

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided for shipping.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const results: any[] = [];
    const shipmentIdsToLabel: number[] = [];

    for (const order of orders) {
      try {
        const orderNo = String(order.order_number).trim();

        // 0. Double-Booking Protection:
        // A. Check local DB first:
        const { data: localRow } = await supabase
          .from('shipping_master')
          .select('id, tracking_number, status, notes, shiprocket_shipment_id')
          .eq('order_number', orderNo)
          .maybeSingle();

        if (localRow?.tracking_number && localRow.tracking_number.trim().length > 0) {
          const sid = localRow.shiprocket_shipment_id;
          if (sid) shipmentIdsToLabel.push(sid);

          results.push({
            order_number: orderNo,
            success: true,
            already_booked: true,
            shipment_id: sid,
            awb_code: localRow.tracking_number,
            courier_name: localRow.notes || 'Already Booked',
            message: 'Order already has an AWB registered in Shipping Master. Duplicate booking skipped.',
          });
          continue;
        }

        // B. Check live Shiprocket API before booking:
        const existingSr = await findShiprocketOrderByNumber(orderNo);
        if (existingSr && existingSr.awb && existingSr.awb.trim().length > 0) {
          const courierName = existingSr.courier || 'Shiprocket Courier';
          let trackingUrl = '';
          if (/delhivery/i.test(courierName)) {
            trackingUrl = `https://www.delhivery.com/track/package/${existingSr.awb}`;
          } else if (/dtdc/i.test(courierName)) {
            trackingUrl = `https://www.dtdc.in/tracking/tracking_results.asp?trCode=${existingSr.awb}`;
          } else if (/xpressbees/i.test(courierName)) {
            trackingUrl = `https://www.xpressbees.com/shipment/tracking?awb=${existingSr.awb}`;
          } else {
            trackingUrl = `https://shiprocket.co/tracking/${existingSr.awb}`;
          }

          await supabase
            .from('shipping_master')
            .update({
              status: 'picked_up',
              courier_partner: 'other',
              tracking_number: existingSr.awb,
              tracking_url: trackingUrl,
              notes: `Shiprocket: ${courierName}`,
              shiprocket_shipment_id: existingSr.shipment_id,
            })
            .eq('order_number', orderNo);

          if (existingSr.shipment_id) {
            shipmentIdsToLabel.push(existingSr.shipment_id);
          }

          results.push({
            order_number: orderNo,
            success: true,
            already_booked: true,
            shipment_id: existingSr.shipment_id,
            awb_code: existingSr.awb,
            courier_name: courierName,
            tracking_url: trackingUrl,
            message: 'Existing Shiprocket booking detected. Synced and duplicate charge prevented.',
          });
          continue;
        }

        const numDeclared = typeof order.declared_value === 'number'
          ? order.declared_value
          : parseFloat(String(order.declared_value || ''));
        const declaredVal = !isNaN(numDeclared) && numDeclared > 0 ? numDeclared : 299;

        // 1. Create Order in Shiprocket
        const orderRes = await createShiprocketOrder({
          order_id: orderNo,
          customer_name: order.customer_name || 'Customer',
          customer_address: order.customer_address || 'Address',
          customer_city: order.customer_city || 'City',
          customer_pincode: order.customer_pincode || '400001',
          customer_state: order.customer_state || 'Maharashtra',
          customer_phone: order.customer_mobile || '9999999999',
          declared_value: declaredVal,
          weight_kg: order.weight_kg || 0.2,
          dimensions_cm: order.dimensions_cm || { length: 18, breadth: 12, height: 4 },
        });

        const shipmentId = orderRes.shipment_id || orderRes.data?.shipment_id;
        if (!shipmentId) {
          throw new Error(`Order created but no shipment_id returned: ${JSON.stringify(orderRes)}`);
        }

        // 2. Assign Chosen Courier & Generate AWB
        const awbRes = await assignShiprocketAWB(shipmentId, order.courier_company_id);
        const awbCode = awbRes.awb_code || awbRes.data?.awb_code;
        const courierName = awbRes.courier_name || awbRes.data?.courier_name || 'Shiprocket Courier';

        if (shipmentId && awbCode) {
          shipmentIdsToLabel.push(shipmentId);
        }

        // 3. Update Supabase shipping_master record
        let trackingUrl = '';
        if (/delhivery/i.test(courierName)) {
          trackingUrl = `https://www.delhivery.com/track/package/${awbCode}`;
        } else if (/dtdc/i.test(courierName)) {
          trackingUrl = `https://www.dtdc.in/tracking/tracking_results.asp?trCode=${awbCode}`;
        } else if (/xpressbees/i.test(courierName)) {
          trackingUrl = `https://www.xpressbees.com/shipment/tracking?awb=${awbCode}`;
        } else {
          trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;
        }

        const nowIso = new Date().toISOString();
        await supabase
          .from('shipping_master')
          .update({
            status: 'picked_up',
            courier_partner: 'other',
            tracking_number: awbCode,
            tracking_url: trackingUrl,
            shipped_at: nowIso,
            notes: `Shiprocket: ${courierName}`,
            shiprocket_shipment_id: shipmentId,
          })
          .eq('order_number', orderNo);

        results.push({
          order_number: orderNo,
          success: true,
          shipment_id: shipmentId,
          awb_code: awbCode,
          courier_name: courierName,
          tracking_url: trackingUrl,
        });
      } catch (err: any) {
        console.error(`Error processing order #${order.order_number}:`, err);
        results.push({
          order_number: order.order_number,
          success: false,
          error: err.message || 'Failed to book shipment on Shiprocket',
        });
      }
    }

    // 3.5 Auto-Schedule Pickup in Shiprocket (removes need to manually visit dashboard!)
    if (shipmentIdsToLabel.length > 0) {
      try {
        await requestShiprocketPickup(shipmentIdsToLabel);
      } catch (pickupErr) {
        console.warn('Auto-schedule pickup warning:', pickupErr);
      }
    }

    // 4. Generate & Crop Combined Labels to 8-on-1 A4 if shipments were booked
    let croppedPdfBase64: string | null = null;
    let labelUrl: string | null = null;

    if (shipmentIdsToLabel.length > 0) {
      try {
        labelUrl = await generateShiprocketLabel(shipmentIdsToLabel);
        if (labelUrl) {
          const pdfRes = await fetch(labelUrl);
          if (pdfRes.ok) {
            const rawBuffer = Buffer.from(await pdfRes.arrayBuffer());
            const croppedBuffer = await cropShiprocketPdfToA4(rawBuffer, '8_on_1');
            croppedPdfBase64 = Buffer.from(croppedBuffer).toString('base64');
          }
        }
      } catch (labelErr) {
        console.error('Failed to auto-generate cropped label:', labelErr);
      }
    }

    // 5. Attempt auto-generating whitespace-trimmed Manifest if available
    let manifestPdfBase64: string | null = null;
    let manifestUrl: string | null = null;
    if (shipmentIdsToLabel.length > 0) {
      try {
        manifestUrl = await generateShiprocketManifest(shipmentIdsToLabel);
        if (manifestUrl) {
          const mRes = await fetch(manifestUrl);
          if (mRes.ok) {
            const rawMBuffer = Buffer.from(await mRes.arrayBuffer());
            const tiled = await tileManifestPdfs([rawMBuffer]);
            manifestPdfBase64 = Buffer.from(tiled).toString('base64');
          }
        }
      } catch (manifestErr) {
        // Manifest may require pickup schedule first depending on courier; non-blocking
        console.log('Manifest not ready at booking time:', manifestErr);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      label_url: labelUrl,
      cropped_pdf_base64: croppedPdfBase64,
      manifest_url: manifestUrl,
      manifest_pdf_base64: manifestPdfBase64,
    });
  } catch (err: any) {
    console.error('Shiprocket create-shipments error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while creating shipments' },
      { status: 500 }
    );
  }
}
