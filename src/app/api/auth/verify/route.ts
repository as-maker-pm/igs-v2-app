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

// In-memory rate limiting: max 10 attempts per minute per IP
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

export async function POST(request: Request) {
  // Rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const record = attempts.get(ip);

  if (record) {
    if (now < record.resetAt) {
      if (record.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Try again in a minute.' },
          { status: 429 }
        );
      }
      record.count++;
    } else {
      attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  try {
    const { password } = await request.json();
    const correctPassword = process.env.IGS_DEMO_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const success = password === correctPassword;

    if (success) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('igs-auth', 'authenticated', {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        // Only send over HTTPS in production; allow HTTP in dev
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }

    return NextResponse.json({ success: false });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
