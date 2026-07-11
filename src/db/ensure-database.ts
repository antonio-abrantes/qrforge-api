import pg from 'pg'

const { Client } = pg

/** Escape a PostgreSQL identifier (database name). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function parseDatabaseUrl(databaseUrl: string): {
  targetDb: string
  maintenanceUrl: string
} {
  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error(
      `Invalid DATABASE_URL: could not parse connection string. Expected e.g. postgres://user:pass@host:5432/dbname`,
    )
  }

  const targetDb = decodeURIComponent(url.pathname.replace(/^\//, '')).trim()
  if (!targetDb) {
    throw new Error(
      'Invalid DATABASE_URL: missing database name in the path (e.g. .../qrapi).',
    )
  }

  const maintenanceDb = process.env.POSTGRES_MAINTENANCE_DB?.trim() || 'postgres'
  const maintenanceUrl = new URL(databaseUrl)
  maintenanceUrl.pathname = `/${encodeURIComponent(maintenanceDb)}`

  return { targetDb, maintenanceUrl: maintenanceUrl.toString() }
}

function isInsufficientPrivilege(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = 'code' in err ? String(err.code) : ''
  const message = 'message' in err ? String(err.message) : ''
  return (
    code === '42501' ||
    /permission denied to create database/i.test(message) ||
    /must be owner|CREATEDB/i.test(message)
  )
}

/**
 * Ensures the database named in DATABASE_URL exists.
 * Connects to the maintenance DB (default `postgres`) and runs CREATE DATABASE if needed.
 * Idempotent: safe when the DB already exists (e.g. Docker POSTGRES_DB).
 */
export async function ensureDatabaseExists(
  databaseUrl: string = process.env.DATABASE_URL ?? '',
): Promise<void> {
  if (!databaseUrl.trim()) {
    throw new Error('DATABASE_URL is required to ensure the database exists.')
  }

  const { targetDb, maintenanceUrl } = parseDatabaseUrl(databaseUrl)

  if (targetDb === (process.env.POSTGRES_MAINTENANCE_DB?.trim() || 'postgres')) {
    console.log(
      `Database "${targetDb}" is the maintenance DB; skipping CREATE DATABASE.`,
    )
    return
  }

  const client = new Client({ connectionString: maintenanceUrl })
  try {
    await client.connect()

    const existing = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists`,
      [targetDb],
    )

    if (existing.rows[0]?.exists) {
      console.log(`Database "${targetDb}" already exists.`)
      return
    }

    console.log(`Creating database "${targetDb}"...`)
    await client.query(`CREATE DATABASE ${quoteIdent(targetDb)}`)
    console.log(`Database "${targetDb}" created.`)
  } catch (err) {
    if (isInsufficientPrivilege(err)) {
      throw new Error(
        `Cannot create database "${targetDb}": the database role lacks CREATEDB privilege. ` +
          `Create it manually (CREATE DATABASE ${quoteIdent(targetDb)};) or grant CREATEDB to the role, then retry.`,
        { cause: err },
      )
    }
    throw err
  } finally {
    await client.end().catch(() => undefined)
  }
}
