import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import {
  generateShiprocketLabel,
  generateShiprocketManifest,
} from '@/lib/shiprocket';
import { cropShiprocketPdfToA4, tileManifestPdfs } from '@/lib/crop-labels';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const search = url.searchParams.get('q') || '';
    const status = url.searchParams.get('status') || '';

    let query = supabase
      .from('shipping_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) {
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
    const { action, shipment_ids, layout = '8_on_1', raw_pdf_base64 } = body;

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

    // 3. Live API fetch for pickup manifest via Shiprocket
    if (action === 'generate_manifest') {
      if (!Array.isArray(shipment_ids) || shipment_ids.length === 0) {
        return NextResponse.json({ error: 'No shipment_ids provided' }, { status: 400 });
      }

      const manifestUrl = await generateShiprocketManifest(shipment_ids);
      const pdfRes = await fetch(manifestUrl);
      if (!pdfRes.ok) {
        throw new Error(`Failed to download manifest PDF from Shiprocket (HTTP ${pdfRes.status})`);
      }
      const rawBuffer = Buffer.from(await pdfRes.arrayBuffer());
      // Tile manifest so it fills page without waste
      const tiled = await tileManifestPdfs([rawBuffer]);

      return NextResponse.json({
        success: true,
        manifest_url: manifestUrl,
        pdf_base64: Buffer.from(tiled).toString('base64'),
      });
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

