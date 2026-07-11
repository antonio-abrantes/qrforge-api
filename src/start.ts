import { config as loadDotenv } from 'dotenv'
import { runMigrations } from './db/run-migrations.js'

loadDotenv()

/**
 * Production / Docker entry: migrate (ensure DB + schema), then listen.
 * Cross-platform — no shell wrapper required.
 */
async function main() {
  await runMigrations()
  // Side-effect import: server.ts boots the HTTP listener
  await import('./server.js')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
