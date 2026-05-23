#!/usr/bin/env tsx
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? 'file:./data/ship-med.db';

  if (url.startsWith('file:')) {
    const filePath = url.slice(5);
    const dir = path.dirname(path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS medicines (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT NOT NULL,
      name_en     TEXT NOT NULL,
      name_ko     TEXT NOT NULL,
      brand_name  TEXT NOT NULL DEFAULT '',
      form        TEXT NOT NULL DEFAULT '',
      strength    TEXT NOT NULL DEFAULT '',
      indication  TEXT NOT NULL DEFAULT '',
      std_intl    INTEGER NOT NULL DEFAULT 0,
      std_dom     INTEGER NOT NULL DEFAULT 0,
      current_qty INTEGER NOT NULL DEFAULT 0,
      barcode     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id),
      type        TEXT NOT NULL,
      quantity    INTEGER NOT NULL,
      actor       TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await client.execute(`DROP INDEX IF EXISTS idx_medicines_name_en`);

  const defaultPinHash = bcrypt.hashSync(process.env.ADMIN_PIN_DEFAULT ?? '1234', 10);
  await client.execute({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: ['admin_pin', defaultPinHash] });
  await client.execute({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: ['ship_name', ''] });
  await client.execute({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: ['route_type', 'international'] });

  client.close();
  console.log('Migration completed:', url);
}

main();
