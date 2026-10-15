import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/adminSession';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete('courier_token');
  return response;
}
