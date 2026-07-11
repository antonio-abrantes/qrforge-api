import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify from 'fastify'
import {
  createJsonSchemaTransform,
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './config/env.js'
import { registerAuth } from './plugins/auth.js'
import { healthRoutes } from './routes/health.js'
import { presetRoutes } from './routes/presets.js'
import { qrcodeRoutes } from './routes/qrcodes.js'
import { userRoutes } from './routes/users.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const HIDDEN_PATHS = new Set([
  '/',
  '/playground',
  '/playground/',
  '/favicon.ico',
  '/docs',
  '/docs/',
  '/docs/json',
  '/docs/yaml',
  '/docs/static/*',
])

export async function buildApp() {
  const config = env()
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: 2 * 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map((s) => s.trim()),
  })

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW_MS,
    keyGenerator: (req) => {
      const key = req.headers['x-api-key']
      if (typeof key === 'string' && key.length > 0) return `key:${key}`
      return req.ip
    },
  })

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'QRForge',
        description: [
          'HTTP API for customizable QR code generation.',
          '',
          '**Auth:** send `X-API-Key` (admin or user key). User management requires the admin key.',
          '',
          '**Servers:** the `/v1` server is relative to the host where you opened `/docs` — localhost in dev, your public domain in production. Paths below are relative to that base (do not repeat `/v1`).',
          '',
          '**Playground:** interactive UI at `/playground` (not part of this OpenAPI).',
        ].join('\n'),
        version: '1.0.0',
      },
      // Relative URL → Swagger UI uses whatever host served /docs
      servers: [
        {
          url: '/v1',
          description: 'API v1 (current host — local or production)',
        },
      ],
      tags: [
        {
          name: 'QR Codes',
          description: 'Generate a single QR (raw data or structured templates), detect payload type, randomize styles.',
        },
        {
          name: 'Batch',
          description: 'Async multi-QR jobs (queue → status → download as ZIP or JSON).',
        },
        {
          name: 'Presets',
          description: 'Ready-made style configs to reuse or override.',
        },
        {
          name: 'Users',
          description: 'Admin-only user and API-key management.',
        },
        {
          name: 'System',
          description: 'Operational checks (outside `/v1`).',
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'Admin key (`ADMIN_API_KEY`) or a user key from `POST /users`.',
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
    },
    transform: createJsonSchemaTransform({
      skipList: [
        '/docs',
        '/docs/',
        '/docs/json',
        '/docs/yaml',
        '/docs/static/*',
        '/playground',
        '/playground/',
        '/playground/*',
        '/assets/*',
        '/favicon.ico',
        '/',
      ],
    }),
    transformObject: (document) => {
      const openapiObject =
        'openapiObject' in document
          ? (document as { openapiObject: Record<string, unknown> }).openapiObject
          : (document as Record<string, unknown>)

      const paths = (openapiObject.paths ?? {}) as Record<string, unknown>
      for (const path of Object.keys(paths)) {
        if (
          HIDDEN_PATHS.has(path) ||
          path.startsWith('/docs') ||
          path.startsWith('/playground') ||
          path.startsWith('/assets')
        ) {
          delete paths[path]
        }
      }

      const health = paths['/health'] as Record<string, Record<string, unknown>> | undefined
      if (health) {
        for (const method of Object.keys(health)) {
          const op = health[method]
          if (op && typeof op === 'object' && 'responses' in op) {
            op.servers = [{ url: '/', description: 'Current host (root)' }]
            op.security = []
          }
        }
      }

      openapiObject.servers = [
        {
          url: '/v1',
          description: 'API v1 (current host — local or production)',
        },
      ]
      openapiObject.paths = paths
      return openapiObject
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  })

  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public', 'assets'),
    prefix: '/assets/',
    decorateReply: false,
  })

  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public', 'playground'),
    prefix: '/playground/',
    decorateReply: false,
  })

  app.get(
    '/playground',
    { schema: { hide: true } },
    async (_req, reply) => reply.redirect('/playground/'),
  )

  app.get(
    '/favicon.ico',
    { schema: { hide: true } },
    async (_req, reply) => reply.redirect('/assets/ico.svg', 302),
  )

  app.get('/', { schema: { hide: true } }, async (req) => {
    const host = req.headers.host ?? `localhost:${config.PORT}`
    const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol
    const base = `${proto}://${host}`
    return {
      name: 'QRForge',
      version: '1.0.0',
      description:
        'HTTP API for customizable QR code generation with styles, templates, batch, and playground.',
      author: 'Antônio Abrantes',
      docs: `${base}/docs`,
      playground: `${base}/playground`,
      health: `${base}/health`,
    }
  })

  registerAuth(app)
  await app.register(healthRoutes)

  // All product API routes under /v1 — OpenAPI paths omit the prefix (server = /v1)
  await app.register(
    async (api) => {
      await api.register(qrcodeRoutes)
      await api.register(userRoutes)
      await api.register(presetRoutes)
    },
    { prefix: '/v1' },
  )

  app.setErrorHandler((err, _req, reply) => {
    if (reply.sent) return

    if (hasZodFastifySchemaValidationErrors(err)) {
      const first = err.validation[0]
      const field = first?.instancePath
        ? first.instancePath.replace(/^\//, '').replace(/\//g, '.')
        : undefined
      return reply.code(400).send({
        error: 'validation_error',
        message: first?.message ?? 'Invalid request',
        ...(field ? { field } : {}),
      })
    }

    app.log.error(err)
    const e = err as { statusCode?: number; message?: string }
    const status = typeof e.statusCode === 'number' ? e.statusCode : 500
    reply.code(status).send({
      error: status >= 500 ? 'internal_error' : 'request_error',
      message: status >= 500 ? 'Unexpected error' : (e.message ?? 'Request error'),
    })
  })

  return app
}
