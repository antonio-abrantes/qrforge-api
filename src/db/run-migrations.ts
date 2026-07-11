import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from './client.js'
import { ensureDatabaseExists } from './ensure-database.js'

/**
 * Creates the target database if missing (role needs CREATEDB),
 * then applies Drizzle migrations from ./drizzle.
 * Idempotent — safe on every container start.
 */
export async function runMigrations(): Promise<void> {
  console.log('Ensuring database exists...')
  await ensureDatabaseExists(process.env.DATABASE_URL)
  console.log('Running migrations...')
  await migrate(db(), { migrationsFolder: './drizzle' })
  console.log('Migrations complete.')
}
