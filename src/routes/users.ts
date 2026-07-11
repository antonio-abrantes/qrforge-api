import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CreateUserSchema, UpdateUserSchema } from '../schemas/users.js'
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  revealKey,
  rotateKey,
  updateUser,
} from '../services/user.service.js'
import { isAppError } from '../utils/errors.js'

const UserIdParams = z.object({
  id: z.string().uuid().describe('User id'),
})

function handle(reply: { code: (n: number) => { send: (b: unknown) => unknown } }, err: unknown) {
  if (isAppError(err)) {
    return reply.code(err.statusCode).send({ error: err.code, message: err.message })
  }
  console.error(err)
  return reply.code(500).send({ error: 'internal_error', message: 'Unexpected error' })
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.addHook('preHandler', async (req, reply) => {
    return app.requireAdmin(req, reply)
  })

  app.post(
    '/users',
    {
      schema: {
        tags: ['Users'],
        summary: 'Create user',
        description:
          'Creates a user and returns the plaintext API key (shown on create only). Admin key required.',
        body: CreateUserSchema,
      },
    },
    async (req, reply) => {
      try {
        const user = await createUser(req.body)
        return reply.code(201).send(user)
      } catch (err) {
        return handle(reply, err)
      }
    },
  )

  app.get(
    '/users',
    {
      schema: {
        tags: ['Users'],
        summary: 'List users',
        description: 'Never includes `apiKey`. Admin key required.',
      },
    },
    async (_req, reply) => {
      try {
        return await listUsers()
      } catch (err) {
        return handle(reply, err)
      }
    },
  )

  app.get(
    '/users/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get user',
        description: 'User detail without `apiKey`. Admin key required.',
        params: UserIdParams,
      },
    },
    async (req, reply) => {
      try {
        return await getUser(req.params.id)
      } catch (err) {
        return handle(reply, err)
      }
    },
  )

  app.get(
    '/users/:id/reveal-key',
    {
      schema: {
        tags: ['Users'],
        summary: 'Reveal API key',
        description: 'Returns the stored plaintext key for recovery. Admin key required.',
        params: UserIdParams,
      },
    },
    async (req, reply) => {
      try {
        return await revealKey(req.params.id)
      } catch (err) {
        return handle(reply, err)
      }
    },
  )

  app.post(
    '/users/:id/rotate-key',
    {
      schema: {
        tags: ['Users'],
        summary: 'Rotate API key',
        description: 'Invalidates the current key and returns a new one. Admin key required.',
        params: UserIdParams,
      },
    },
    async (req, reply) => {
      try {
        return await rotateKey(req.params.id)
      } catch (err) {
        return handle(reply, err)
      }
    },
  )

  app.patch(
    '/users/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Update name, email, and/or active flag. Admin key required.',
        params: UserIdParams,
        body: UpdateUserSchema,
      },
    },
    async (req, reply) => {
      try {
        return await updateUser(req.params.id, req.body)
      } catch (err) {
        return handle(reply, err)
      }
    },
  )

  app.delete(
    '/users/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Delete user',
        description:
          'Hard-deletes the user. Prefer `active: false` via PATCH when you need soft disable. Admin key required.',
        params: UserIdParams,
      },
    },
    async (req, reply) => {
      try {
        return await deleteUser(req.params.id)
      } catch (err) {
        return handle(reply, err)
      }
    },
  )
}
