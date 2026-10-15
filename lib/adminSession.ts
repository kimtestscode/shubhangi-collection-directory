export interface AdminUserSession {
  id: string;
  name: string;
  username: string;
  role: string;
  user_type: string;
  department: string;
  designation: string;
  home_branch: string;
  channel: string;
  permissions: Record<string, any>;
  issuedAt: number;
}

const SESSION_COOKIE_NAME = 'admin_user_session';

/**
 * Encodes a user session object to a safe URL-encoded base64 string.
 */
export function encodeUserSession(session: AdminUserSession): string {
  const json = JSON.stringify(session);
  return Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Decodes and validates a session string.
 */
export function decodeUserSession(token: string | undefined | null): AdminUserSession | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    if (!parsed || !parsed.username || !parsed.role) return null;
    return parsed as AdminUserSession;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
