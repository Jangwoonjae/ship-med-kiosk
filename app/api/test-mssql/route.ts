import { getMssqlPool } from '@/lib/mssql';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pool = await getMssqlPool();
    await pool.request().query('SELECT 1');

    const tableRes = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%arcode%' OR TABLE_NAME LIKE '%arCode%'
    `);

    let barcodeRow: any = null;
    let barcodeError: string | null = null;
    try {
      const barcodeRes = await pool.request().query('SELECT TOP 1 * FROM BarCodeData');
      barcodeRow = barcodeRes.recordset[0] ?? null;
    } catch (e) {
      barcodeError = String(e);
    }

    return NextResponse.json({
      connected: true,
      tables: tableRes.recordset,
      barcodeRow,
      barcodeError,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: String(error),
      message: (error as any)?.message,
      code: (error as any)?.code,
      host: process.env.MSSQL_HOST,
      port: process.env.MSSQL_PORT,
    });
  }
}
