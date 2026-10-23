import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { cropShiprocketPdfToA4 } from '@/lib/crop-labels';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const layout = ((formData.get('layout') as string) || '4_on_1') as '4_on_1' | '2_on_1';

    if (!file) {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const outputBytes = await cropShiprocketPdfToA4(fileBuffer, layout);

    return new NextResponse(Buffer.from(outputBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Shiprocket_Labels_Cropped_A4.pdf"',
      },
    });
  } catch (err: any) {
    console.error('Failed to crop Shiprocket labels:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process and crop PDF' },
      { status: 500 }
    );
  }
}
