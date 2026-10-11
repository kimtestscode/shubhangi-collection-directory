import { NextRequest, NextResponse } from 'next/server';
import { getAdminUsers, updateAdminUser } from '@/lib/adminUsers';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const enteredPassword = String(body.password || '').trim();
  const enteredUsername = String(body.username || '').trim().toLowerCase();
  const secret = process.env.ADMIN_SECRET || 'ShubhangiAdmin2026!';

  let authenticatedUser = null;

  // 1. Check if directly matches master ADMIN_SECRET
  if (enteredPassword && enteredPassword === secret) {
    authenticatedUser = {
      name: 'Super Admin (Master)',
      role: 'super_admin',
      username: 'admin',
    };
  } else if (enteredUsername && enteredPassword) {
    // 2. Check individual user accounts
    const { users } = await getAdminUsers();
    const matched = users.find(
      (u) =>
        u.username.toLowerCase() === enteredUsername &&
        (u.password === enteredPassword || (u.pin && u.pin === enteredPassword))
    );

    if (matched) {
      if (!matched.is_active) {
        return NextResponse.json(
          { error: 'Account has been deactivated. Please contact store administrator.' },
          { status: 403 }
        );
      }
      authenticatedUser = matched;
      // Record last login time asynchronously
      updateAdminUser(matched.id, { last_login_at: new Date().toISOString() }).catch(() => {});
    }
  } else if (enteredPassword) {
    // 3. User entered only password (legacy mode) - also check if matches any user's password/pin
    const { users } = await getAdminUsers();
    const matched = users.find(
      (u) => u.is_active && (u.password === enteredPassword || u.pin === enteredPassword)
    );
    if (matched) {
      authenticatedUser = matched;
      updateAdminUser(matched.id, { last_login_at: new Date().toISOString() }).catch(() => {});
    }
  }

  if (!authenticatedUser) {
    return NextResponse.json(
      { error: 'Invalid login credentials. कृपया योग्य युझरनेम किंवा पासवर्ड टाका.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    success: true,
    user: {
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      username: authenticatedUser.username,
    },
  });

  response.cookies.set('admin_token', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}
