import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_COURIER_PIN } from '@/lib/courierAuth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const enteredPin = String(body.pin || '').trim();
  const validPin = (process.env.COURIER_PIN || DEFAULT_COURIER_PIN).trim();

  if (!enteredPin || enteredPin !== validPin) {
    return NextResponse.json({ error: 'Invalid PIN. कृपया योग्य पिन टाका.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('courier_token', validPin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
