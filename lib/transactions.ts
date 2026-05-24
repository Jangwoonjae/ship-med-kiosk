import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db, schema, client } from './db';
import { updateMedicineQty } from './medicines';

const { transactions, medicines } = schema;

export async function listTransactions(params?: {
  medicineId?: number;
  type?: string;
  actor?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const conditions = [];
  if (params?.medicineId) conditions.push(eq(transactions.medicine_id, params.medicineId));
  if (params?.type) conditions.push(eq(transactions.type, params.type));
  if (params?.dateFrom) conditions.push(gte(transactions.created_at, params.dateFrom));
  if (params?.dateTo) conditions.push(lte(transactions.created_at, params.dateTo + 'T23:59:59'));

  const rows = await db
    .select({
      id: transactions.id,
      medicine_id: transactions.medicine_id,
      type: transactions.type,
      quantity: transactions.quantity,
      actor: transactions.actor,
      note: transactions.note,
      created_at: transactions.created_at,
      name_ko: medicines.name_ko,
      name_en: medicines.name_en,
      category: medicines.category,
    })
    .from(transactions)
    .leftJoin(medicines, eq(transactions.medicine_id, medicines.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.created_at))
    .all();

  if (params?.search) {
    const s = params.search.toLowerCase();
    return rows.filter(r =>
      r.name_ko?.toLowerCase().includes(s) ||
      r.name_en?.toLowerCase().includes(s)
    );
  }
  return rows;
}

export async function recordTransaction(data: {
  medicine_id: number;
  type: 'in' | 'out' | 'adj';
  quantity: number;
  actor: string;
  note?: string;
}) {
  const delta = data.type === 'out' ? -Math.abs(data.quantity) : data.quantity;

  const medicine = await db.select().from(medicines).where(eq(medicines.id, data.medicine_id)).get();
  if (!medicine) throw new Error('의약품을 찾을 수 없습니다.');

  if (data.type === 'out' && medicine.current_qty < Math.abs(data.quantity)) {
    throw new Error('재고가 부족합니다.');
  }

  await client.execute('BEGIN');
  try {
    await client.execute({
      sql: `UPDATE medicines SET current_qty = current_qty + ?, updated_at = datetime('now') WHERE id = ?`,
      args: [delta, data.medicine_id],
    });
    const inserted = await client.execute({
      sql: `INSERT INTO transactions (medicine_id, type, quantity, actor, note, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [data.medicine_id, data.type, data.quantity, data.actor, data.note ?? ''],
    });
    await client.execute('COMMIT');
    return { id: Number(inserted.lastInsertRowid), ...data };
  } catch (e) {
    await client.execute('ROLLBACK');
    throw e;
  }
}

export async function recordBatchOut(items: Array<{ medicine_id: number; quantity: number }>, actor: string) {
  const results = [];
  for (const item of items) {
    results.push(
      await recordTransaction({ medicine_id: item.medicine_id, type: 'out', quantity: item.quantity, actor })
    );
  }
  return results;
}
