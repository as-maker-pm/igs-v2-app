import { NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, getUsers } from '@/lib/users';
import { encodeSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, quickLogin } = await request.json();

    let user;
    if (quickLogin) {
      const users = getUsers();
      user = users.find(u => u.role === quickLogin);
      if (!user) return NextResponse.json({ error: 'No user with that role' }, { status: 404 });
    } else {
      if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      user = findUserByEmail(email);
      if (!user || !verifyPassword(user, password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const session = encodeSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    response.cookies.set('igs-session', session, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
