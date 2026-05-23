import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

async function run() {
  await client.execute('DROP INDEX IF EXISTS idx_medicines_name_en');
  return NextResponse.json({ ok: true, message: 'idx_medicines_name_en dropped' });
}

export async function GET() {
  try { return await run(); } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST() {
  try { return await run(); } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
