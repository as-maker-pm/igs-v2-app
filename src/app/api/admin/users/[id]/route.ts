import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsers, updateUserRole, deleteUser } from '@/lib/users';
import { decodeSession } from '@/lib/auth';

async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('igs-session')?.value;
  if (!token) return null;
  const session = decodeSession(token);
  return session?.role ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerRole = await getCallerRole();
  const { role } = await request.json();
  const target = getUsers().find(u => u.id === id);
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.role === 'super_admin' && callerRole !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (role === 'super_admin' && callerRole !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const user = updateUserRole(id, role);
  return NextResponse.json({ user });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerRole = await getCallerRole();
  const target = getUsers().find(u => u.id === id);
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.role === 'super_admin' && callerRole !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  deleteUser(id);
  return NextResponse.json({ ok: true });
}
