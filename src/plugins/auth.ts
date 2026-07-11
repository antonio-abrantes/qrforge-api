import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'
import { findUserByApiKey } from '../services/user.service.js'

export type AuthContext =
  | { type: 'admin' }
  | { type: 'user'; userId: string }
  | { type: 'none' }

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext
  }
  interface FastifyInstance {
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => void | FastifyReply
  }
}

const PUBLIC_PATHS = new Set([
  '/',
  '/health',
  '/favicon.ico',
  '/docs',
  '/docs/',
  '/docs/json',
  '/playground',
  '/playground/',
])

function isPublic(url: string): boolean {
  const path = url.split('?')[0] ?? url
  if (PUBLIC_PATHS.has(path)) return true
  if (path.startsWith('/docs/')) return true
  if (path.startsWith('/playground/')) return true
  if (path.startsWith('/assets/')) return true
  return false
}

async function authHook(req: FastifyRequest, reply: FastifyReply) {
  req.auth = { type: 'none' }
  if (isPublic(req.url) || req.method === 'OPTIONS') return

  const keyHeader = req.headers['x-api-key']
  const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader
  if (!key) {
    return reply
      .code(401)
      .send({ error: 'missing_api_key', message: 'X-API-Key header is required' })
  }

  if (key === env().ADMIN_API_KEY) {
    req.auth = { type: 'admin' }
    return
  }

  const user = await findUserByApiKey(key)
  if (!user || !user.active) {
    return reply
      .code(401)
      .send({ error: 'invalid_api_key', message: 'Invalid or inactive API key' })
  }
  req.auth = { type: 'user', userId: user.id }
}

function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (req.auth.type !== 'admin') {
    return reply.code(403).send({
      error: 'forbidden',
      message: 'Admin API key required',
    })
  }
}

/**
 * Registers auth decorator + global hooks on the root app.
 * Must NOT be registered via `app.register()` alone — Fastify encapsulation
 * would keep hooks off sibling route plugins. Call this on the root instance.
 */
export function registerAuth(app: FastifyInstance): void {
  // Fastify 5: object request decorators must use getter/setter (no shared reference).
  app.decorateRequest('auth', {
    getter(this: FastifyRequest): AuthContext {
      return (this as FastifyRequest & { _auth?: AuthContext })._auth ?? { type: 'none' }
    },
    setter(this: FastifyRequest, value: AuthContext) {
      ;(this as FastifyRequest & { _auth?: AuthContext })._auth = value
    },
  })
  app.decorate('requireAdmin', requireAdmin)
  app.addHook('onRequest', async (req) => {
    req.auth = { type: 'none' }
  })
  app.addHook('preHandler', authHook)
}
