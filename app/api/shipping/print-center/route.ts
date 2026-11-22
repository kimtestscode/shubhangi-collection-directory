import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import {
  generateShiprocketLabel,
  generateShiprocketManifest,
  printShiprocketManifest,
  fetchShiprocketScheduledPickups,
  requestShiprocketPickup,
} from '@/lib/shiprocket';
import { cropShiprocketPdfToA4, tileManifestPdfs } from '@/lib/crop-labels';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';

    // Live Shiprocket Scheduled Pickups (direct API from Shiprocket)
    if (action === 'get_live_pickups') {
      const livePickups = await fetchShiprocketScheduledPickups();
      return NextResponse.json({ live_pickups: livePickups });
    }

    const supabase = createAdminClient();
    const search = url.searchParams.get('q') || '';
    const status = url.searchParams.get('status') || '';

    let query = supabase
      .from('shipping_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_mobile.ilike.%${search}%,tracking_number.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({ entries: data || [] });
  } catch (err: any) {
    console.error('Print center fetch error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch shipping entries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, shipment_ids, order_ids, layout = '8_on_1', raw_pdf_base64 } = body;

    // 0. Fetch live scheduled pickups directly from Shiprocket
    if (action === 'get_live_pickups') {
      const livePickups = await fetchShiprocketScheduledPickups();
      return NextResponse.json({ success: true, live_pickups: livePickups });
    }

    // 1. Process uploaded raw PDF directly (for manual label crop or manifest combining)
    if (action === 'crop_uploaded_labels') {
      if (!raw_pdf_base64) {
        return NextResponse.json({ error: 'Missing raw_pdf_base64' }, { status: 400 });
      }
      const rawBuffer = Buffer.from(raw_pdf_base64, 'base64');
      const croppedBuffer = await cropShiprocketPdfToA4(rawBuffer, layout);
      return NextResponse.json({
        success: true,
        pdf_base64: Buffer.from(croppedBuffer).toString('base64'),
      });
    }

    if (action === 'combine_uploaded_manifests') {
      const pdfs: string[] = body.manifest_pdfs_base64 || [];
      if (raw_pdf_base64) {
        // Single multi-page combined manifest PDF (e.g. raw_15_Manifest.pdf)
        const rawBuffer = Buffer.from(raw_pdf_base64, 'base64');
        const combined = await tileManifestPdfs([rawBuffer]);
        return NextResponse.json({
          success: true,
          pdf_base64: Buffer.from(combined).toString('base64'),
        });
      }

      if (!Array.isArray(pdfs) || pdfs.length === 0) {
        return NextResponse.json({ error: 'No manifest PDFs provided' }, { status: 400 });
      }
      const buffers = pdfs.map((b) => Buffer.from(b, 'base64'));
      const combined = await tileManifestPdfs(buffers);
      return NextResponse.json({
        success: true,
        pdf_base64: Buffer.from(combined).toString('base64'),
      });
    }

    // 2. Live API fetch for labels via Shiprocket
    if (action === 'generate_labels') {
      if (!Array.isArray(shipment_ids) || shipment_ids.length === 0) {
        return NextResponse.json({ error: 'No shipment_ids provided' }, { status: 400 });
      }

      const labelUrl = await generateShiprocketLabel(shipment_ids);
      const pdfRes = await fetch(labelUrl);
      if (!pdfRes.ok) {
        throw new Error(`Failed to download label PDF from Shiprocket (HTTP ${pdfRes.status})`);
      }
      const rawBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const croppedBuffer = await cropShiprocketPdfToA4(rawBuffer, layout);

      return NextResponse.json({
        success: true,
        label_url: labelUrl,
        pdf_base64: Buffer.from(croppedBuffer).toString('base64'),
      });
    }

    // 3. Live API fetch for pickup manifest via Shiprocket (single or multiple shipments/orders)
    if (action === 'generate_manifest') {
      let manifestUrl = '';
      if (Array.isArray(order_ids) && order_ids.length > 0) {
        manifestUrl = await printShiprocketManifest(order_ids);
      } else if (Array.isArray(shipment_ids) && shipment_ids.length > 0) {
        manifestUrl = await generateShiprocketManifest(shipment_ids, order_ids);
      } else {
        return NextResponse.json({ error: 'No shipment_ids or order_ids provided' }, { status: 400 });
      }

      const pdfRes = await fetch(manifestUrl);
      if (!pdfRes.ok) {
        throw new Error(`Failed to download manifest PDF from Shiprocket (HTTP ${pdfRes.status})`);
      }
      const rawBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const tiled = await tileManifestPdfs([rawBuffer]);

      return NextResponse.json({
        success: true,
        manifest_url: manifestUrl,
        pdf_base64: Buffer.from(tiled).toString('base64'),
      });
    }

    // 4. Combine ALL Live Scheduled Courier Manifests from Shiprocket into 1 Zero-Waste A4 PDF
    if (action === 'combine_all_live_manifests') {
      const livePickups = await fetchShiprocketScheduledPickups();
      const validPickups = livePickups.filter(
        (p) => p.pickup_id && p.pickup_id !== 'PENDING_PICKUP_QUEUE' && p.order_ids.length > 0
      );

      if (validPickups.length === 0) {
        return NextResponse.json(
          { error: 'No scheduled pickups with manifests found on Shiprocket right now.' },
          { status: 400 }
        );
      }

      const buffers: Buffer[] = [];
      const manifestUrls: string[] = [];

      for (const p of validPickups) {
        try {
          const url = await printShiprocketManifest(p.order_ids);
          if (url) {
            manifestUrls.push(url);
            const res = await fetch(url);
            if (res.ok) {
              buffers.push(Buffer.from(await res.arrayBuffer()));
            }
          }
        } catch (e) {
          console.warn(`Could not fetch manifest for pickup ${p.pickup_id}:`, e);
        }
      }

      if (buffers.length === 0) {
        throw new Error('Failed to download any manifest PDFs from Shiprocket.');
      }

      const combinedTiled = await tileManifestPdfs(buffers);

      return NextResponse.json({
        success: true,
        count: buffers.length,
        manifest_urls: manifestUrls,
        pdf_base64: Buffer.from(combinedTiled).toString('base64'),
      });
    }

    // 5. Bulk Schedule Pickup for shipments directly from app
    if (action === 'schedule_pickup') {
      if (!Array.isArray(shipment_ids) || shipment_ids.length === 0) {
        return NextResponse.json({ error: 'No shipment_ids provided' }, { status: 400 });
      }
      const pickupRes = await requestShiprocketPickup(shipment_ids);
      return NextResponse.json({ success: true, result: pickupRes });
    }

    // 6. Sync live Shiprocket orders & AWBs with Supabase database
    if (action === 'sync_live_shiprocket_orders') {
      const livePickups = await fetchShiprocketScheduledPickups();
      const supabase = createAdminClient();
      let updatedCount = 0;

      for (const group of livePickups) {
        for (const o of group.orders) {
          if (o.order_number && o.awb) {
            const { error: upErr } = await supabase
              .from('shipping_master')
              .update({
                status: 'picked_up',
                tracking_number: o.awb,
                courier_partner: 'other',
                notes: `Shiprocket: ${group.courier}`,
              })
              .eq('order_number', o.order_number);
            if (!upErr) updatedCount++;
          }
        }
      }

      return NextResponse.json({ success: true, updated_count: updatedCount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Print center API error:', err);
    return NextResponse.json(
      { error: err.message || 'Operation failed' },
      { status: 500 }
    );
  }
}

