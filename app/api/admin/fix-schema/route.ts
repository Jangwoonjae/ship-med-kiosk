import { client } from '@/lib/db';

export async function GET() {
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS medicines_backup AS SELECT * FROM medicines`);

    await client.execute(`DROP TABLE medicines`);

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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    await client.execute(`INSERT INTO medicines SELECT * FROM medicines_backup`);

    await client.execute(`DROP TABLE medicines_backup`);

    const count = await client.execute(`SELECT COUNT(*) as cnt FROM medicines`);
    const info = await client.execute(`PRAGMA table_info(medicines)`);

    return Response.json({
      ok: true,
      message: 'name_en NOT NULL 제약 제거 완료',
      count: count.rows[0],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nameEnNullable: info.rows.find((r: any) => r.name === 'name_en'),
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) });
  }
}

export async function POST() {
  return GET();
}
