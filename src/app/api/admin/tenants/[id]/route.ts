import { NextResponse } from 'next/server';
import { updateTenant, deleteTenant } from '@/lib/tenants';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const tenant = updateTenant(id, data);
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'tenant-001') return NextResponse.json({ error: 'Cannot delete the primary tenant' }, { status: 403 });
  const ok = deleteTenant(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
