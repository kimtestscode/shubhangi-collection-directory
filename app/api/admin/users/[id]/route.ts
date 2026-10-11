import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { updateAdminUser, deleteAdminUser } from '@/lib/adminUsers';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updated = await updateAdminUser(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized();

  const { id } = await params;
  if (id === 'usr_super_admin') {
    return NextResponse.json({ error: 'Cannot delete primary super admin account' }, { status: 400 });
  }

  const ok = await deleteAdminUser(id);
  return NextResponse.json({ success: ok });
}
