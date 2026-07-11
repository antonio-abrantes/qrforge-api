import { config as loadDotenv } from 'dotenv'
import { closeDb } from './client.js'
import { runMigrations } from './run-migrations.js'

loadDotenv()

async function main() {
  await runMigrations()
  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
