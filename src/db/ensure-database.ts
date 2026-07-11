import pg from 'pg'

const { Client } = pg

/** Escape a PostgreSQL identifier (database name). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

export type ParsedDatabaseUrl = {
  targetDb: string
  user: string
  host: string
  /** Original URL unchanged (password preserved). */
  connectionString: string
}

/**
 * Parse DATABASE_URL without going through URL.toString() rewrites that can
 * corrupt passwords with reserved characters (#, @, :, %, etc.).
 */
export function parseDatabaseUrl(databaseUrl: string): ParsedDatabaseUrl {
  const trimmed = databaseUrl.trim()
  if (!trimmed) {
    throw new Error('DATABASE_URL is required to ensure the database exists.')
  }

  // postgres[ql]://[user[:password]@]host[:port]/db][?params]
  const match = trimmed.match(
    /^(postgres(?:ql)?):\/\/(?:([^:@/?#]*)(?::([^@/?#]*))?@)?([^:/?#]+)(?::(\d+))?\/([^?#]*)/i,
  )
  if (!match) {
    throw new Error(
      `Invalid DATABASE_URL: could not parse connection string. Expected e.g. postgres://user:pass@host:5432/dbname`,
    )
  }

  const user = decodeURIComponent(match[2] ?? '')
  const host = match[4] ?? ''
  const targetDb = decodeURIComponent((match[6] ?? '').replace(/^\//, '').trim())
  if (!targetDb) {
    throw new Error(
      'Invalid DATABASE_URL: missing database name in the path (e.g. .../qrapi).',
    )
  }
  if (!host) {
    throw new Error('Invalid DATABASE_URL: missing host.')
  }
  // Broken Compose nested ${} often produces names like "qrapi@host:5432/qrapi}".
  if (/[@/:{}]/.test(targetDb)) {
    throw new Error(
      `Invalid DATABASE_URL: database name looks corrupted ("${targetDb}"). ` +
        `Do not nest \${} inside another \${} in stack.yml. ` +
        `Use: DATABASE_URL: postgres://qrapi:\${QRAPI_DB_PASSWORD}@qrapi-postgres:5432/qrapi`,
    )
  }

  return { targetDb, user: user || 'postgres', host, connectionString: trimmed }
}

/** Swap only the database name in the path; leave user/password/host intact. */
export function withDatabaseName(databaseUrl: string, dbName: string): string {
  const qIndex = databaseUrl.indexOf('?')
  const base = qIndex >= 0 ? databaseUrl.slice(0, qIndex) : databaseUrl
  const query = qIndex >= 0 ? databaseUrl.slice(qIndex) : ''
  const schemeSep = base.indexOf('://')
  if (schemeSep < 0) {
    throw new Error('Invalid DATABASE_URL: missing scheme.')
  }
  const pathStart = base.indexOf('/', schemeSep + 3)
  if (pathStart < 0) {
    return `${base}/${encodeURIComponent(dbName)}${query}`
  }
  return `${base.slice(0, pathStart)}/${encodeURIComponent(dbName)}${query}`
}

function pgErrCode(err: unknown): string {
  if (!err || typeof err !== 'object') return ''
  return 'code' in err ? String(err.code) : ''
}

function isDatabaseMissing(err: unknown): boolean {
  const code = pgErrCode(err)
  const message = err instanceof Error ? err.message : String(err)
  return code === '3D000' || /database ".*" does not exist/i.test(message)
}

function isPasswordAuthFailed(err: unknown): boolean {
  const code = pgErrCode(err)
  const message = err instanceof Error ? err.message : String(err)
  return code === '28P01' || /password authentication failed/i.test(message)
}

function isInsufficientPrivilege(err: unknown): boolean {
  const code = pgErrCode(err)
  const message = err instanceof Error ? err.message : String(err)
  return (
    code === '42501' ||
    /permission denied to create database/i.test(message) ||
    /must be owner|CREATEDB/i.test(message)
  )
}

async function tryConnect(connectionString: string): Promise<void> {
  const client = new Client({ connectionString })
  try {
    await client.connect()
  } finally {
    await client.end().catch(() => undefined)
  }
}

/**
 * Ensures the database named in DATABASE_URL exists.
 *
 * Order matters for Docker images with POSTGRES_USER/POSTGRES_DB != postgres:
 * 1) Try the target DB first (already created by the image).
 * 2) Only if it is missing, connect to a maintenance DB and CREATE DATABASE.
 *
 * Never rewrites the URL via `new URL().toString()` (that can corrupt passwords).
 */
export async function ensureDatabaseExists(
  databaseUrl: string = process.env.DATABASE_URL ?? '',
): Promise<void> {
  const { targetDb, user, host, connectionString } = parseDatabaseUrl(databaseUrl)
  console.log(
    `Ensuring database exists (host=${host}, user=${user}, database=${targetDb})...`,
  )

  // 1) Happy path: target DB already exists (typical Docker POSTGRES_DB=qrapi).
  try {
    await tryConnect(connectionString)
    console.log(`Database "${targetDb}" already reachable.`)
    return
  } catch (err) {
    if (isPasswordAuthFailed(err)) {
      throw new Error(
        `PostgreSQL password authentication failed for user "${user}" at host "${host}". ` +
          `The password in DATABASE_URL must match POSTGRES_PASSWORD (or the role password on an external server). ` +
          `Note: POSTGRES_PASSWORD is only applied when the data volume is first created — ` +
          `changing it later does not update an existing volume.`,
        { cause: err },
      )
    }
    if (!isDatabaseMissing(err)) {
      throw err
    }
    console.log(`Database "${targetDb}" does not exist yet; will try to create it.`)
  }

  const maintenanceDb = process.env.POSTGRES_MAINTENANCE_DB?.trim() || 'postgres'
  if (maintenanceDb === targetDb) {
    throw new Error(
      `Database "${targetDb}" does not exist, and POSTGRES_MAINTENANCE_DB is the same name — ` +
        `cannot CREATE DATABASE. Create it manually or set POSTGRES_DB in the Postgres service.`,
    )
  }

  const maintenanceUrl = withDatabaseName(connectionString, maintenanceDb)
  console.log(`Connecting to maintenance database "${maintenanceDb}" to create "${targetDb}"...`)

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
    if (isPasswordAuthFailed(err)) {
      throw new Error(
        `PostgreSQL password authentication failed for user "${user}" while connecting to ` +
          `maintenance database "${maintenanceDb}" on host "${host}". ` +
          `For Docker Postgres with POSTGRES_USER/POSTGRES_DB set to your app user, set ` +
          `POSTGRES_MAINTENANCE_DB to that same database name, or ensure DATABASE_URL password ` +
          `matches POSTGRES_PASSWORD.`,
        { cause: err },
      )
    }
    if (isDatabaseMissing(err)) {
      throw new Error(
        `Maintenance database "${maintenanceDb}" does not exist on host "${host}". ` +
          `Docker images with POSTGRES_USER != postgres often have no "postgres" database. ` +
          `Set POSTGRES_MAINTENANCE_DB=${targetDb} (and rely on POSTGRES_DB), or create the DB manually.`,
        { cause: err },
      )
    }
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
