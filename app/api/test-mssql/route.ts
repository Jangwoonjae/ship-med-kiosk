import { getMssqlPool } from '@/lib/mssql';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pool = await getMssqlPool();
    await pool.request().query('SELECT 1');
    return NextResponse.json({ connected: true });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
