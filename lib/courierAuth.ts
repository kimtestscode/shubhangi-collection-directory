import type { NextRequest } from 'next/server';

export const DEFAULT_COURIER_PIN = '4792';

export function isCourierRequest(req: NextRequest): boolean {
  const pin = process.env.COURIER_PIN || DEFAULT_COURIER_PIN;
  const adminSecret = process.env.ADMIN_SECRET;

  const courierToken = req.cookies.get('courier_token')?.value;
  const adminToken = req.cookies.get('admin_token')?.value;

  // Courier token matches OR Admin token matches
  if (courierToken && courierToken === pin) return true;
  if (adminSecret && adminToken && adminToken === adminSecret) return true;

  return false;
}
