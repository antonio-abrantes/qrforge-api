import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  ADMIN_API_KEY: z.string().min(32),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_TIME_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  BATCH_MAX_ITEMS: z.coerce.number().int().positive().default(500),
  BATCH_BASE64_MAX_ITEMS: z.coerce.number().int().positive().default(200),
  CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
  IMAGE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  IMAGE_FETCH_MAX_BYTES: z.coerce.number().int().positive().default(2_097_152),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function env(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid environment: ${details}`)
  }
  cached = parsed.data
  return cached
}
