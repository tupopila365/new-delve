import { z } from 'zod'
import { DEFAULT_API_PORT } from '@delve/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(DEFAULT_API_PORT),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(8).optional(),
  TRAVELER_WEB_URL: z.string().url().default('http://localhost:8443'),
  ADMIN_WEB_URL: z.string().url().default('http://localhost:5174'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  return parsed.data
}
