import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getPreset, listPresets } from '../lib/qr-core/index.js'

export const presetRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get(
    '/presets',
    {
      schema: {
        tags: ['Presets'],
        summary: 'List style presets',
      },
    },
    async () => ({
      presets: listPresets().map(({ id, name, config }) => ({ id, name, config })),
    }),
  )

  app.get(
    '/presets/:id',
    {
      schema: {
        tags: ['Presets'],
        summary: 'Get preset by id',
        params: z.object({
          id: z.string().min(1).describe('Preset id, e.g. rounded-blue'),
        }),
      },
    },
    async (req, reply) => {
      const preset = getPreset(req.params.id)
      if (!preset) {
        return reply
          .code(404)
          .send({ error: 'preset_not_found', message: `Preset '${req.params.id}' not found` })
      }
      return preset
    },
  )
}
