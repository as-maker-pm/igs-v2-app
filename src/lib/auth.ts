export type UserRole = 'super_admin' | 'admin' | 'user' | 'viewer';

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

export function encodeSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64url');
}

export function decodeSession(token: string): SessionPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
