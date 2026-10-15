import { NextRequest, NextResponse } from 'next/server';
import { getAdminUsers, updateAdminUser, getDefaultRedirect, ROLE_CONFIG, UserRole } from '@/lib/adminUsers';
import { encodeUserSession, SESSION_COOKIE_NAME } from '@/lib/adminSession';
import { DEFAULT_COURIER_PIN } from '@/lib/courierAuth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const enteredPassword = String(body.password || '').trim();
  const enteredUsername = String(body.username || '').trim().toLowerCase();
  const secret = process.env.ADMIN_SECRET || 'ShubhangiAdmin2026!';
  const validCourierPin = (process.env.COURIER_PIN || DEFAULT_COURIER_PIN).trim();

  let authenticatedUser: any = null;

  // 1. Check if directly matches master ADMIN_SECRET
  if (enteredPassword && enteredPassword === secret && (!enteredUsername || enteredUsername === 'admin')) {
    authenticatedUser = {
      id: 'usr_super_admin',
      name: 'Super Admin (Master)',
      username: 'admin',
      role: 'super_admin' as UserRole,
      user_type: 'ADMIN',
      department: 'Administration',
      designation: 'Store Owner',
      home_branch: 'Solapur Main Branch',
      channel: 'Web + Mobile',
      permissions: ROLE_CONFIG.super_admin.defaultPermissions,
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
      updateAdminUser(matched.id, { last_login_at: new Date().toISOString() }).catch(() => {});
    }
  } else if (enteredPassword) {
    // 3. User entered only password (legacy mode)
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

  const role = authenticatedUser.role as UserRole;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.staff;
  const redirectTo = getDefaultRedirect(role);

  const sessionData = {
    id: authenticatedUser.id,
    name: authenticatedUser.name,
    username: authenticatedUser.username,
    role: authenticatedUser.role,
    user_type: authenticatedUser.user_type || roleConfig.user_type,
    department: authenticatedUser.department || roleConfig.department,
    designation: authenticatedUser.designation || roleConfig.designation,
    home_branch: authenticatedUser.home_branch || roleConfig.home_branch,
    channel: authenticatedUser.channel || roleConfig.channel,
    permissions: authenticatedUser.permissions,
    issuedAt: Date.now(),
  };

  const sessionToken = encodeUserSession(sessionData);

  const response = NextResponse.json({
    success: true,
    user: {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      username: authenticatedUser.username,
      department: sessionData.department,
      designation: sessionData.designation,
    },
    redirectTo,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  };

  // Set admin_token
  response.cookies.set('admin_token', secret, cookieOptions);

  // Set admin_user_session
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions);

  // If courier partner, also set courier_token for instant access to /courier
  if (role === 'courier_partner') {
    response.cookies.set('courier_token', validCourierPin, cookieOptions);
  }

  return response;
}
