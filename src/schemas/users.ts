import { z } from 'zod'

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  active: z.boolean().optional(),
})

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
