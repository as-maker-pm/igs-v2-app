import { NextResponse } from 'next/server';
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('igs-session');
  response.cookies.delete('igs-auth');
  return response;
}
