import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function POST() {
  try {
    await client.execute('DROP INDEX IF EXISTS idx_medicines_name_en');
    return NextResponse.json({ ok: true, message: 'idx_medicines_name_en dropped' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
