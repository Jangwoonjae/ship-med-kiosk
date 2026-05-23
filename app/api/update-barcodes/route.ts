import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { getMssqlPool, sql } from '@/lib/mssql';

async function searchBarcode(pool: Awaited<ReturnType<typeof getMssqlPool>>, keyword: string): Promise<string | null> {
  const res = await pool.request()
    .input('kw', sql.NVarChar, keyword)
    .query(`
      SELECT TOP 1 BoxBarcode
      FROM tblBarcodeinBox
      WHERE BoxBarName LIKE '%' + @kw + '%'
        AND BoxBarcode IS NOT NULL
        AND BoxBarcode <> ''
    `);
  return res.recordset[0]?.BoxBarcode ?? null;
}

export async function GET() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL ?? 'file:./data/ship-med.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const { rows } = await turso.execute(
      'SELECT id, name_ko, name_en, brand_name FROM medicines ORDER BY id'
    );

    const pool = await getMssqlPool();

    const results: { id: number; name_ko: string; barcode: string | null; matched: boolean; matchedBy?: string }[] = [];

    for (const row of rows) {
      const id      = row[0] as number;
      const name_ko = row[1] as string;
      const name_en = row[2] as string;
      const brand   = row[3] as string;

      let barcode: string | null = null;
      let matchedBy: string | undefined;

      barcode = await searchBarcode(pool, name_ko);
      if (barcode) { matchedBy = `name_ko`; }

      if (!barcode && name_en) {
        barcode = await searchBarcode(pool, name_en);
        if (barcode) { matchedBy = `name_en`; }
      }

      if (!barcode && brand) {
        barcode = await searchBarcode(pool, brand);
        if (barcode) { matchedBy = `brand_name`; }
      }

      if (barcode) {
        await turso.execute({
          sql: "UPDATE medicines SET barcode = ?, updated_at = datetime('now') WHERE id = ?",
          args: [barcode, id],
        });
      }

      results.push({ id, name_ko, barcode, matched: !!barcode, matchedBy });
    }

    const matched = results.filter(r => r.matched).length;

    return NextResponse.json({
      total: rows.length,
      matched,
      failed: rows.length - matched,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error), message: (error as any)?.message, code: (error as any)?.code },
      { status: 500 }
    );
  } finally {
    turso.close();
  }
}
