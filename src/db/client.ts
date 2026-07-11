import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { env } from '../config/env.js'
import * as schema from './schema.js'

const { Pool } = pg

let pool: pg.Pool | null = null
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env().DATABASE_URL })
  }
  return pool
}

export function db() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema })
  }
  return dbInstance
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    dbInstance = null
  }
}
