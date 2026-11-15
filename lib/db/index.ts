import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const globalForDatabase = globalThis as unknown as { pool?: Pool }

export const pool = globalForDatabase.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
})

if (process.env.NODE_ENV !== 'production') globalForDatabase.pool = pool

export const db = drizzle(pool, { schema })
