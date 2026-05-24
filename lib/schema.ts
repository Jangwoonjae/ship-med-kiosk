import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const medicines = sqliteTable('medicines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(), // '주사약' | '내용약' | '외용약'
  name_en: text('name_en'),
  name_ko: text('name_ko').notNull(),
  brand_name: text('brand_name').notNull().default(''),
  form: text('form').notNull().default(''),
  strength: text('strength').notNull().default(''),
  indication: text('indication').notNull().default(''),
  std_intl: integer('std_intl').notNull().default(0),
  std_dom: integer('std_dom').notNull().default(0),
  current_qty: integer('current_qty').notNull().default(0),
  barcode: text('barcode'),
  expiry_date: text('expiry_date'),
  lot_no: text('lot_no'),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicine_id: integer('medicine_id').notNull().references(() => medicines.id),
  type: text('type').notNull(), // 'in' | 'out' | 'adj'
  quantity: integer('quantity').notNull(),
  actor: text('actor').notNull(),
  note: text('note').notNull().default(''),
  created_at: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Medicine = typeof medicines.$inferSelect;
export type NewMedicine = typeof medicines.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
