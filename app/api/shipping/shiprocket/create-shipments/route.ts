import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  createShiprocketOrder,
  assignShiprocketAWB,
  generateShiprocketLabel,
} from '@/lib/shiprocket';
import { cropShiprocketPdfToA4 } from '@/lib/crop-labels';

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

        // 1. Create Order in Shiprocket
        const orderRes = await createShiprocketOrder({
          order_id: orderNo,
          customer_name: order.customer_name || 'Customer',
          customer_address: order.customer_address || 'Address',
          customer_city: order.customer_city || 'City',
          customer_pincode: order.customer_pincode || '400001',
          customer_state: order.customer_state || 'Maharashtra',
          customer_phone: order.customer_mobile || '9999999999',
          declared_value: order.declared_value || 299,
          weight_kg: order.weight_kg || 0.2,
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

    // 4. Generate & Crop Combined Labels if shipments were booked
    let croppedPdfBase64: string | null = null;
    let labelUrl: string | null = null;

    if (shipmentIdsToLabel.length > 0) {
      try {
        labelUrl = await generateShiprocketLabel(shipmentIdsToLabel);
        if (labelUrl) {
          const pdfRes = await fetch(labelUrl);
          if (pdfRes.ok) {
            const rawBuffer = Buffer.from(await pdfRes.arrayBuffer());
            const croppedBuffer = await cropShiprocketPdfToA4(rawBuffer, '4_on_1');
            croppedPdfBase64 = Buffer.from(croppedBuffer).toString('base64');
          }
        }
      } catch (labelErr) {
        console.error('Failed to auto-generate cropped label:', labelErr);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      label_url: labelUrl,
      cropped_pdf_base64: croppedPdfBase64,
    });
  } catch (err: any) {
    console.error('Shiprocket create-shipments error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while creating shipments' },
      { status: 500 }
    );
  }
}
