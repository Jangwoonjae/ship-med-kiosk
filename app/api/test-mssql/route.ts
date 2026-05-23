import { getMssqlPool } from '@/lib/mssql';
import { NextResponse } from 'next/server';

const TABLES = [
  'tblBarcodeQuestion',
  'tm_ReadBarcodePrBase',
  'tblBarcodeMake',
  'tblBarcodeinBox',
];

async function queryTable(pool: any, tableName: string) {
  let columns: string[] = [];
  let row: any = null;
  let error: string | null = null;
  try {
    const colRes = await pool.request().query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`
    );
    columns = colRes.recordset.map((r: any) => r.COLUMN_NAME);

    const rowRes = await pool.request().query(`SELECT TOP 1 * FROM ${tableName}`);
    row = rowRes.recordset[0] ?? null;
  } catch (e) {
    error = String(e);
  }
  return { columns, row, error };
}

export async function GET() {
  try {
    const pool = await getMssqlPool();
    await pool.request().query('SELECT 1');

    const results: Record<string, any> = {};
    for (const table of TABLES) {
      results[table] = await queryTable(pool, table);
    }

    return NextResponse.json({ connected: true, results });
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
