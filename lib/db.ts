import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

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

export const db = drizzle(client, { schema });
export { schema };
