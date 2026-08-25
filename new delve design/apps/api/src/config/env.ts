import { z } from 'zod'
import { DEFAULT_API_PORT } from '@delve/config'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
    API_PORT: z.coerce.number().int().positive().default(DEFAULT_API_PORT),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(16),
    TRAVELER_WEB_URL: z.string().url().default('http://localhost:8443'),
    ADMIN_WEB_URL: z.string().url().default('http://localhost:5174'),
    /** Preferred alias; falls back to ADMIN_WEB_URL when unset. */
    ADMIN_WEB_ORIGIN: z.string().url().optional(),
    ADMIN_SESSION_COOKIE_NAME: z.string().min(1).default('delve_admin_session'),
    ADMIN_CSRF_COOKIE_NAME: z.string().min(1).default('delve_admin_csrf'),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
    ADMIN_SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
    BREVO_API_KEY: z.string().optional(),
    BREVO_SENDER_EMAIL: z.string().email().optional().or(z.literal('')),
    BREVO_SENDER_NAME: z.string().optional(),
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
    EMAIL_VERIFICATION_MAX_SENDS_PER_HOUR: z.coerce.number().int().positive().default(5),
    /** @deprecated Prefer Cloudinary for user media. Kept for legacy avatar read fallback. */
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER_PREFIX: z.string().default('delve'),
    CLOUDINARY_UPLOAD_SIGNATURE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    CLOUDINARY_MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(500 * 1024 * 1024),
    CLOUDINARY_WEBHOOK_SECRET: z.string().optional(),
    TRUST_GEO_HEADERS: z.string().optional(),
    /** Max frequency for lastSeenAt writes (seconds). Default 300 (5 minutes). */
    SESSION_LAST_SEEN_THROTTLE_SECONDS: z.coerce.number().int().positive().default(300),
    SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    SECURITY_EVENT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_CONNECT_COUNTRY: z.string().optional(),
    DELVE_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10000).default(1000),
    RECONCILIATION_STALE_MINUTES: z.coerce.number().int().positive().default(15),
    RECONCILIATION_BATCH_LIMIT: z.coerce.number().int().positive().max(200).default(40),
    RECONCILIATION_INTERVAL_MINUTES: z.coerce.number().int().positive().default(20),
    RECONCILIATION_SCHEDULE_ENABLED: z.string().optional(),
    RECONCILIATION_JOB_SECRET: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const appEnv = value.APP_ENV ?? (value.NODE_ENV === 'production' ? 'production' : 'development')
    const strict = appEnv === 'production' || appEnv === 'staging'
    if (strict) {
      if (!value.BREVO_API_KEY?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['BREVO_API_KEY'],
          message: 'BREVO_API_KEY is required in staging and production',
        })
      }
      if (!value.BREVO_SENDER_EMAIL?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['BREVO_SENDER_EMAIL'],
          message: 'BREVO_SENDER_EMAIL is required in staging and production',
        })
      }
      if (!value.TRAVELER_WEB_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['TRAVELER_WEB_URL'],
          message: 'TRAVELER_WEB_URL must use HTTPS in staging and production',
        })
      }
      if (!value.ADMIN_WEB_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ADMIN_WEB_URL'],
          message: 'ADMIN_WEB_URL must use HTTPS in staging and production (Secure admin cookies require HTTPS)',
        })
      }
      const adminOrigin = value.ADMIN_WEB_ORIGIN?.trim() || value.ADMIN_WEB_URL
      if (!adminOrigin.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ADMIN_WEB_ORIGIN'],
          message: 'ADMIN_WEB_ORIGIN must use HTTPS in staging and production',
        })
      }
      if (!value.CLOUDINARY_CLOUD_NAME?.trim() || !value.CLOUDINARY_API_KEY?.trim() || !value.CLOUDINARY_API_SECRET?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_SECRET'],
          message: 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required in staging and production',
        })
      }
    }
  })

export type Env = Omit<
  z.infer<typeof envSchema>,
  'TRUST_GEO_HEADERS' | 'ADMIN_WEB_ORIGIN' | 'STRIPE_CONNECT_COUNTRY'
> & {
  appEnv: 'development' | 'staging' | 'production'
  brevoConfigured: boolean
  /** @deprecated Legacy S3 avatar path */
  storageConfigured: boolean
  cloudinaryConfigured: boolean
  stripeConfigured: boolean
  reconciliationScheduleEnabled: boolean
  TRUST_GEO_HEADERS: boolean
  /** Explicit admin-web origin for CORS and CSRF checks. */
  ADMIN_WEB_ORIGIN: string
  STRIPE_CONNECT_COUNTRY: string | undefined
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
      .replace(/CLOUDINARY_API_SECRET[^;]*/gi, 'CLOUDINARY_API_SECRET: [redacted issue]')
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  const value = parsed.data
  const appEnv = value.APP_ENV ?? (value.NODE_ENV === 'production' ? 'production' : 'development')
  const brevoConfigured = Boolean(value.BREVO_API_KEY?.trim() && value.BREVO_SENDER_EMAIL?.trim())
  const storageConfigured = Boolean(
    value.S3_BUCKET?.trim() &&
      value.S3_ACCESS_KEY_ID?.trim() &&
      value.S3_SECRET_ACCESS_KEY?.trim() &&
      value.S3_PUBLIC_BASE_URL?.trim(),
  )
  const cloudinaryConfigured = Boolean(
    value.CLOUDINARY_CLOUD_NAME?.trim() &&
      value.CLOUDINARY_API_KEY?.trim() &&
      value.CLOUDINARY_API_SECRET?.trim(),
  )
  const stripeConfigured = Boolean(value.STRIPE_SECRET_KEY?.trim())
  const scheduleRaw = value.RECONCILIATION_SCHEDULE_ENABLED?.trim().toLowerCase()
  const reconciliationScheduleEnabled =
    scheduleRaw === 'true' || scheduleRaw === '1'
      ? true
      : scheduleRaw === 'false' || scheduleRaw === '0'
        ? false
        : value.NODE_ENV !== 'test'
  const raw = value.TRUST_GEO_HEADERS?.trim().toLowerCase()
  const trustGeo =
    raw === 'true' || raw === '1'
      ? true
      : raw === 'false' || raw === '0'
        ? false
        : appEnv === 'staging' || appEnv === 'production'
  return {
    ...value,
    appEnv,
    brevoConfigured,
    storageConfigured,
    cloudinaryConfigured,
    stripeConfigured,
    reconciliationScheduleEnabled,
    TRUST_GEO_HEADERS: trustGeo,
    ADMIN_WEB_ORIGIN: value.ADMIN_WEB_ORIGIN?.trim() || value.ADMIN_WEB_URL,
    STRIPE_CONNECT_COUNTRY: value.STRIPE_CONNECT_COUNTRY?.trim().toUpperCase() || undefined,
  }
}
