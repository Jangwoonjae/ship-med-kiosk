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

    let sample: any[] = [];
    let sampleError: string | null = null;
    try {
      const sampleRes = await pool.request().query(
        'SELECT TOP 20 BoxBarcode, BoxBarName, BoxBarSpec FROM tblBarcodeinBox'
      );
      sample = sampleRes.recordset;
    } catch (e) {
      sampleError = String(e);
    }

    let prBase: any[] = [];
    let prBaseError: string | null = null;
    try {
      const prBaseRes = await pool.request().query(
        'SELECT TOP 5 ProductID, ProductName, Spec, Barcode, Barcode3 FROM tm_ReadBarcodePrBase'
      );
      prBase = prBaseRes.recordset;
    } catch (e) {
      prBaseError = String(e);
    }

    let countInBox: number | null = null;
    let countPrBase: number | null = null;
    let countError: string | null = null;
    try {
      const c1 = await pool.request().query('SELECT COUNT(*) as cnt FROM tblBarcodeinBox');
      const c2 = await pool.request().query('SELECT COUNT(*) as cnt FROM tm_ReadBarcodePrBase');
      countInBox  = c1.recordset[0]?.cnt ?? null;
      countPrBase = c2.recordset[0]?.cnt ?? null;
    } catch (e) {
      countError = String(e);
    }

    return NextResponse.json({
      connected: true,
      results,
      sample,
      sampleError,
      prBase,
      prBaseError,
      counts: { tblBarcodeinBox: countInBox, tm_ReadBarcodePrBase: countPrBase, error: countError },
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
