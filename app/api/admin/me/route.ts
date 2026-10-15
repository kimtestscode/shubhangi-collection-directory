import { NextRequest, NextResponse } from 'next/server';
import { decodeUserSession, SESSION_COOKIE_NAME } from '@/lib/adminSession';
import { getAdminUsers, ROLE_CONFIG } from '@/lib/adminUsers';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET || 'ShubhangiAdmin2026!';
  const adminToken = req.cookies.get('admin_token')?.value;
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // 1. If user session cookie exists, decode and verify
  if (sessionToken) {
    const session = decodeUserSession(sessionToken);
    if (session) {
      // Refresh user from DB to verify active status
      const { users } = await getAdminUsers();
      const current = users.find((u) => u.username.toLowerCase() === session.username.toLowerCase());

      if (current) {
        if (!current.is_active) {
          const res = NextResponse.json({ error: 'Account inactive', user: null }, { status: 403 });
          res.cookies.delete(SESSION_COOKIE_NAME);
          res.cookies.delete('admin_token');
          return res;
        }

        return NextResponse.json({
          user: {
            id: current.id,
            name: current.name,
            username: current.username,
            email: current.email,
            phone: current.phone,
            role: current.role,
            user_type: current.user_type,
            department: current.department,
            designation: current.designation,
            home_branch: current.home_branch,
            channel: current.channel,
            permissions: current.permissions,
          },
        });
      }
    }
  }

  // 2. Fallback to master admin if admin_token matches ADMIN_SECRET
  if (adminToken && adminToken === secret) {
    return NextResponse.json({
      user: {
        id: 'usr_super_admin',
        name: 'Super Admin (Master)',
        username: 'admin',
        role: 'super_admin',
        user_type: 'ADMIN',
        department: 'Administration',
        designation: 'Store Owner',
        home_branch: 'Solapur Main Branch',
        channel: 'Web + Mobile',
        permissions: ROLE_CONFIG.super_admin.defaultPermissions,
      },
    });
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
