import { env } from 'cloudflare:workers';
import { SCHEMA_STATEMENTS } from '@/db/schema';

type Bindings = { DB: D1Database };

let schemaReady: Promise<void> | undefined;

export function getDb(): D1Database {
  const db = (env as unknown as Bindings).DB;
  if (!db) {
    throw new Error('D1 binding DB не подключён');
  }
  return db;
}

export async function ensureSchema(): Promise<D1Database> {
  const db = getDb();
  schemaReady ??= db
    .batch(SCHEMA_STATEMENTS.map((statement) => db.prepare(statement)))
    .then(() => undefined)
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  await schemaReady;
  return db;
}
