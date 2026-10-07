import type { NextRequest } from 'next/server';

/**
 * Same check the /admin proxy does, for API routes (the proxy only covers /admin pages).
 * Server-only: never import this from a client component.
 */
export function isAdminRequest(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  const token = req.cookies.get('admin_token')?.value;
  return Boolean(secret && token && token === secret);
}
