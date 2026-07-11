import { randomBytes } from 'node:crypto'

/** Equivalent to `openssl rand -hex 64` (128 hex chars). */
export function generateApiKey(): string {
  return randomBytes(64).toString('hex')
}
