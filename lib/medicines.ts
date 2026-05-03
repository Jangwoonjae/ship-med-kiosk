import { eq, like, or, and, sql } from 'drizzle-orm';
import { db, schema } from './db';
import { getStockStatus, type StockStatus } from './stockUtils';

export { getStockStatus, type StockStatus };

const { medicines } = schema;

export function getStdQty(medicine: { std_intl: number; std_dom: number }, routeType: string): number {
  return routeType === 'international' ? medicine.std_intl : medicine.std_dom;
}

export async function listMedicines(params?: {
  category?: string;
  search?: string;
  status?: StockStatus;
  routeType?: string;
}) {
  const routeType = params?.routeType ?? 'international';
  let query = db.select().from(medicines).$dynamic();

  const conditions = [];
  if (params?.category) conditions.push(eq(medicines.category, params.category));
  if (params?.search) {
    conditions.push(
      or(
        like(medicines.name_en, `%${params.search}%`),
        like(medicines.name_ko, `%${params.search}%`),
        like(medicines.brand_name, `%${params.search}%`)
      )
    );
  }
  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows = await query.all();

  if (params?.status) {
    return rows.filter(m => {
      const std = getStdQty(m, routeType);
      return getStockStatus(m.current_qty, std) === params.status;
    });
  }
  return rows;
}

export async function getMedicineById(id: number) {
  return db.select().from(medicines).where(eq(medicines.id, id)).get();
}

export async function getMedicineByBarcode(barcode: string) {
  return db.select().from(medicines).where(eq(medicines.barcode, barcode)).get();
}

export async function createMedicine(data: schema.NewMedicine) {
  const now = new Date().toISOString();
  return db.insert(medicines).values({ ...data, created_at: now, updated_at: now }).returning().get();
}

export async function updateMedicineQty(id: number, delta: number) {
  const now = new Date().toISOString();
  return db
    .update(medicines)
    .set({ current_qty: sql`${medicines.current_qty} + ${delta}`, updated_at: now })
    .where(eq(medicines.id, id))
    .returning()
    .get();
}

export async function updateMedicine(id: number, data: Partial<schema.NewMedicine>) {
  const now = new Date().toISOString();
  return db
    .update(medicines)
    .set({ ...data, updated_at: now })
    .where(eq(medicines.id, id))
    .returning()
    .get();
}

export async function getSummaryStats(routeType = 'international') {
  const all = await listMedicines({ routeType });
  const stats = { total: all.length, normal: 0, warning: 0, critical: 0 };
  for (const m of all) {
    const std = getStdQty(m, routeType);
    const status = getStockStatus(m.current_qty, std);
    if (status === 'normal') stats.normal++;
    else if (status === 'warning') stats.warning++;
    else if (status === 'critical' || status === 'empty') stats.critical++;
  }
  return stats;
}
