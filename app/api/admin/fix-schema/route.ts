import { client } from '@/lib/db';

export async function GET() {
  try {
    const indexes = await client.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='medicines'");

    await client.execute('DROP INDEX IF EXISTS idx_medicines_name_en');
    await client.execute('DROP INDEX IF EXISTS medicines_name_en_unique');
    await client.execute('DROP INDEX IF EXISTS medicines_name_en_idx');

    const tableInfo = await client.execute('PRAGMA table_info(medicines)');

    return Response.json({
      ok: true,
      indexes: indexes.rows,
      tableInfo: tableInfo.rows,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) });
  }
}

export async function POST() {
  return GET();
}
