import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Liveness probe. Public — no API key. Served at host root (not under `/v1`).',
        security: [],
        response: {
          200: z.object({
            status: z.literal('ok'),
            service: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    async () => ({
      status: 'ok' as const,
      service: 'qrforge',
      timestamp: new Date().toISOString(),
    }),
  )
}
