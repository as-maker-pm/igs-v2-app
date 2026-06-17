import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsers, createUser } from '@/lib/users';
import { decodeSession } from '@/lib/auth';

async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('igs-session')?.value;
  if (!token) return null;
  const session = decodeSession(token);
  return session?.role ?? null;
}

export async function GET() {
  const callerRole = await getCallerRole();
  let users = getUsers().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt }));
  if (callerRole !== 'super_admin') {
    users = users.filter(u => u.role !== 'super_admin');
  }
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    const callerRole = await getCallerRole();
    const { email, name, role, password } = await request.json();
    if (!email || !name || !role || !password) return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    if (role === 'super_admin' && callerRole !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const existing = getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    const user = createUser({ email, name, role, password });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt } });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
