import { NextResponse } from 'next/server';
import { getTenants, createTenant } from '@/lib/tenants';

export async function GET() {
  const tenants = getTenants();
  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const tenant = createTenant(data);
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
