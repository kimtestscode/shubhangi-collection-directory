import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getAdminUsers, createAdminUser } from '@/lib/adminUsers';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const { users, isTablePresent } = await getAdminUsers();
  return NextResponse.json({ users, isTablePresent });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.username || !body.password) {
    return NextResponse.json(
      { error: 'Name, username, and password are required' },
      { status: 400 }
    );
  }

  const created = await createAdminUser(body);
  return NextResponse.json(created, { status: 201 });
}
