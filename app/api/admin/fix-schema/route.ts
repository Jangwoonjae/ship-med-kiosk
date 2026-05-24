import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await client.execute('PRAGMA foreign_keys = OFF');

    // 컬럼 먼저 추가 (없으면) — 백업에 포함되도록
    await client.execute(`ALTER TABLE medicines ADD COLUMN expiry_date TEXT`).catch(() => {});
    await client.execute(`ALTER TABLE medicines ADD COLUMN lot_no TEXT`).catch(() => {});

    await client.execute('CREATE TABLE IF NOT EXISTS medicines_backup AS SELECT * FROM medicines');

    await client.execute('DROP TABLE medicines');

    await client.execute(`CREATE TABLE medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name_en TEXT,
      name_ko TEXT NOT NULL,
      brand_name TEXT NOT NULL DEFAULT '',
      form TEXT NOT NULL DEFAULT '',
      strength TEXT NOT NULL DEFAULT '',
      indication TEXT NOT NULL DEFAULT '',
      std_intl INTEGER NOT NULL DEFAULT 0,
      std_dom INTEGER NOT NULL DEFAULT 0,
      current_qty INTEGER NOT NULL DEFAULT 0,
      barcode TEXT,
      expiry_date TEXT,
      lot_no TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    await client.execute(`INSERT INTO medicines
      (id, category, name_en, name_ko, brand_name, form, strength, indication,
       std_intl, std_dom, current_qty, barcode, expiry_date, lot_no, created_at, updated_at)
      SELECT id, category, name_en, name_ko, brand_name, form, strength, indication,
             std_intl, std_dom, current_qty, barcode, expiry_date, lot_no, created_at, updated_at
      FROM medicines_backup`);

    await client.execute('DROP TABLE medicines_backup');

    await client.execute('PRAGMA foreign_keys = ON');

    const count = await client.execute('SELECT COUNT(*) as cnt FROM medicines');

    return Response.json({
      ok: true,
      message: 'schema fix 완료 (expiry_date, lot_no 추가)',
      count: count.rows[0],
    });
  } catch (e) {
    try { await client.execute('PRAGMA foreign_keys = ON'); } catch { /* ignore */ }
    return Response.json({ ok: false, error: String(e) });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
