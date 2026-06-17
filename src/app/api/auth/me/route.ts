import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSession } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('igs-session')?.value;
  if (!token) return NextResponse.json({ user: null });
  const session = decodeSession(token);
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: session.id, email: session.email, name: session.name, role: session.role } });
}
