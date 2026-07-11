import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users, type User } from '../db/schema.js'
import type { CreateUserInput, UpdateUserInput } from '../schemas/users.js'
import { generateApiKey } from '../utils/api-key.js'
import { AppError } from '../utils/errors.js'

function toPublic(user: User, includeKey = false) {
  const base = {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
  if (includeKey) return { ...base, apiKey: user.apiKey }
  return base
}

export async function createUser(input: CreateUserInput) {
  const apiKey = generateApiKey()
  try {
    const [row] = await db()
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        apiKey,
      })
      .returning()
    return toPublic(row!, true)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/unique|duplicate/i.test(message)) {
      throw new AppError('Email already exists', 409, 'email_taken')
    }
    throw err
  }
}

export async function listUsers() {
  const rows = await db().select().from(users).orderBy(users.createdAt)
  return { users: rows.map((u) => toPublic(u)) }
}

export async function getUser(id: string) {
  const row = await findById(id)
  return toPublic(row)
}

export async function revealKey(id: string) {
  const row = await findById(id)
  return { id: row.id, apiKey: row.apiKey }
}

export async function rotateKey(id: string) {
  const apiKey = generateApiKey()
  const [row] = await db()
    .update(users)
    .set({ apiKey, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  if (!row) throw new AppError('User not found', 404, 'user_not_found')
  return { id: row.id, apiKey: row.apiKey }
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const patch: Partial<User> = { updatedAt: new Date() }
  if (input.name !== undefined) patch.name = input.name
  if (input.email !== undefined) patch.email = input.email.toLowerCase()
  if (input.active !== undefined) patch.active = input.active

  try {
    const [row] = await db().update(users).set(patch).where(eq(users.id, id)).returning()
    if (!row) throw new AppError('User not found', 404, 'user_not_found')
    return toPublic(row)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    if (/unique|duplicate/i.test(message)) {
      throw new AppError('Email already exists', 409, 'email_taken')
    }
    throw err
  }
}

export async function deleteUser(id: string) {
  const [row] = await db().delete(users).where(eq(users.id, id)).returning()
  if (!row) throw new AppError('User not found', 404, 'user_not_found')
  return { id: row.id, deleted: true }
}

export async function findUserByApiKey(apiKey: string): Promise<User | undefined> {
  const [row] = await db().select().from(users).where(eq(users.apiKey, apiKey)).limit(1)
  return row
}

async function findById(id: string): Promise<User> {
  const [row] = await db().select().from(users).where(eq(users.id, id)).limit(1)
  if (!row) throw new AppError('User not found', 404, 'user_not_found')
  return row
}
