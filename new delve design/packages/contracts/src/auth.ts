import { z } from 'zod'

/** Reserved usernames — blocked regardless of case. Shared by API and traveler. */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'api',
  'auth',
  'account',
  'delve',
  'delveworldwide',
  'help',
  'support',
  'security',
  'system',
  'staff',
  'moderator',
  'root',
  'login',
  'logout',
  'signup',
  'register',
  'settings',
  'profile',
  'explore',
  'contact',
  'investors',
] as const

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** True when the identifier should be treated as an email address. */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@')
}

export function isReservedUsername(username: string): boolean {
  return (RESERVED_USERNAMES as readonly string[]).includes(normalizeUsername(username))
}

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/i

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .refine(value => !value.includes('@') && !/\s/.test(value), 'Username cannot contain spaces or @')
  .refine(value => !value.includes('..'), 'Username cannot contain consecutive periods')
  .refine(
    value => USERNAME_PATTERN.test(value),
    'Username must start and end with a letter or number and may only include letters, numbers, underscores and periods',
  )
  .refine(value => !isReservedUsername(value), 'That username is reserved')
  .transform(normalizeUsername)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')

export const registerBodySchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().email('Enter a valid email address').transform(normalizeEmail),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine(data => data.password === data.passwordConfirmation, {
    message: 'Both passwords need to match',
    path: ['passwordConfirmation'],
  })

export const loginBodySchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
})

export const usernameAvailabilityQuerySchema = z.object({
  username: z.string().trim().min(1),
})

/** @deprecated Prefer usernameAvailabilityQuerySchema */
export const usernameAvailableQuerySchema = usernameAvailabilityQuerySchema

export const resendVerificationBodySchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
})

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1),
})

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
})

export const changeUsernameBodySchema = z.object({
  username: usernameSchema,
  currentPassword: z.string().min(1, 'Enter your current password'),
})

export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  emailVerified: z.boolean(),
  usernameChangedAt: z.string().datetime().nullable().optional(),
})

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
})

export const loginSuccessDataSchema = z.object({
  user: publicUserSchema,
  tokens: authTokensSchema,
})

export const usernameAvailabilityReasonSchema = z.enum(['invalid', 'reserved', 'taken', 'available'])

export const usernameAvailabilityDataSchema = z.object({
  username: z.string(),
  valid: z.boolean(),
  available: z.boolean(),
  reason: usernameAvailabilityReasonSchema,
})

/** @deprecated Prefer usernameAvailabilityDataSchema */
export const usernameAvailableDataSchema = usernameAvailabilityDataSchema

export const registerSuccessDataSchema = z.object({
  email: z.string().email(),
  message: z.string(),
  deliveryStatus: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
})

export const verifyEmailResultSchema = z.enum([
  'success',
  'already_verified',
  'expired',
  'used',
  'invalid',
  'account_disabled',
])

export const verifyEmailDataSchema = z.object({
  result: verifyEmailResultSchema,
  message: z.string(),
})

export const changeUsernameSuccessSchema = z.object({
  username: z.string(),
  usernameChangedAt: z.string().datetime(),
  nextChangeAvailableAt: z.string().datetime(),
})

export const GENERIC_AUTH_FAILURE_MESSAGE = 'Invalid email/username or password'

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30

export const adminForbiddenErrorSchema = z.object({
  code: z.literal('ADMIN_FORBIDDEN'),
  message: z.string(),
})

export const sessionRevokedErrorSchema = z.object({
  code: z.enum(['SESSION_REVOKED', 'SESSION_EXPIRED', 'UNAUTHORIZED']),
  message: z.string(),
})

export const adminPublicUserSchema = publicUserSchema.extend({
  role: z.literal('admin'),
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type PublicUser = z.infer<typeof publicUserSchema>
export type AuthTokens = z.infer<typeof authTokensSchema>
export type LoginSuccessData = z.infer<typeof loginSuccessDataSchema>
export type UsernameAvailabilityData = z.infer<typeof usernameAvailabilityDataSchema>
export type VerifyEmailResult = z.infer<typeof verifyEmailResultSchema>
export type ChangeUsernameBody = z.infer<typeof changeUsernameBodySchema>
export type ChangeUsernameSuccess = z.infer<typeof changeUsernameSuccessSchema>
