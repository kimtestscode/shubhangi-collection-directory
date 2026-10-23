import { NextRequest, NextResponse } from 'next/server';
import { generatePickupManifestPdf, ManifestParcelItem } from '@/lib/manifest-pdf';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parcels: ManifestParcelItem[] = body.parcels || [];

    if (!Array.isArray(parcels) || parcels.length === 0) {
      return NextResponse.json({ error: 'No parcels provided for manifest generation.' }, { status: 400 });
    }

    const pickupDate = body.pickupDate;
    const transporterName = body.transporterName || 'Shiprocket Transporter';
    const pickupLocation = body.pickupLocation || 'Kamothe, Navi Mumbai (410209)';

    const pdfBytes = await generatePickupManifestPdf({
      parcels,
      pickupDate,
      transporterName,
      pickupLocation,
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Pickup_Manifest_2_on_1_${Date.now()}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Error generating manifest PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate pickup manifest' },
      { status: 500 }
    );
  }
}
