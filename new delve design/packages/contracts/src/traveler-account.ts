import { z } from 'zod'

export const TRAVEL_INTERESTS = [
  'culture',
  'food',
  'nature',
  'adventure',
  'history',
  'art',
  'music',
  'wellness',
  'wildlife',
  'beaches',
  'mountains',
  'cities',
  'nightlife',
  'family_travel',
  'solo_travel',
  'sustainable_travel',
] as const

export type TravelInterest = (typeof TRAVEL_INTERESTS)[number]

export const TRAVEL_INTEREST_LABELS: Record<TravelInterest, string> = {
  culture: 'Culture',
  food: 'Food',
  nature: 'Nature',
  adventure: 'Adventure',
  history: 'History',
  art: 'Art',
  music: 'Music',
  wellness: 'Wellness',
  wildlife: 'Wildlife',
  beaches: 'Beaches',
  mountains: 'Mountains',
  cities: 'Cities',
  nightlife: 'Nightlife',
  family_travel: 'Family travel',
  solo_travel: 'Solo travel',
  sustainable_travel: 'Sustainable travel',
}

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'ZAR',
  'NAD',
  'BWP',
  'ZMW',
  'KES',
  'NGN',
  'GHS',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
] as const

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'pt', 'de', 'es', 'af'] as const

export const onboardingStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters')
  .max(60, 'Display name must be at most 60 characters')

export const bioSchema = z
  .string()
  .trim()
  .max(280, 'Bio must be at most 280 characters')
  .optional()
  .nullable()

export const homeCitySchema = z.string().trim().max(80).optional().nullable()
export const homeCountryCodeSchema = z.preprocess(
  value => (value === '' || value === undefined ? null : value),
  z
    .string()
    .length(2, 'Use a 2-letter country code')
    .regex(/^[A-Za-z]{2}$/, 'Use a 2-letter country code')
    .transform(v => v.toUpperCase())
    .nullable()
    .optional(),
)

export const currencySchema = z.enum(SUPPORTED_CURRENCIES)
export const languageSchema = z.enum(SUPPORTED_LANGUAGES)

export const interestsSchema = z
  .array(z.enum(TRAVEL_INTERESTS))
  .max(TRAVEL_INTERESTS.length)
  .default([])

export const travelerProfileSchema = z.object({
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  homeCity: z.string().nullable(),
  homeCountryCode: z.string().nullable(),
  preferredCurrency: currencySchema,
  preferredLanguage: languageSchema,
  interests: z.array(z.enum(TRAVEL_INTERESTS)),
  onboardingStatus: onboardingStatusSchema,
  onboardingCompletedAt: z.string().datetime().nullable(),
  username: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  storageConfigured: z.boolean().optional(),
})

export const onboardingPatchSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema,
    homeCity: homeCitySchema,
    homeCountryCode: homeCountryCodeSchema,
    preferredCurrency: currencySchema.optional(),
    preferredLanguage: languageSchema.optional(),
    interests: interestsSchema.optional(),
    step: z.enum(['identity', 'travel', 'preferences']).optional(),
  })
  .strict()

export const onboardingCompleteSchema = z.object({
  displayName: displayNameSchema,
  preferredCurrency: currencySchema,
  preferredLanguage: languageSchema,
  bio: bioSchema,
  homeCity: homeCitySchema,
  homeCountryCode: homeCountryCodeSchema,
  interests: interestsSchema.optional(),
})

export const profileUpdateSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema,
    homeCity: homeCitySchema,
    homeCountryCode: homeCountryCodeSchema,
    preferredCurrency: currencySchema.optional(),
    preferredLanguage: languageSchema.optional(),
    interests: interestsSchema.optional(),
  })
  .strict()

export const avatarUploadUrlBodySchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  contentLength: z.number().int().positive().max(5 * 1024 * 1024),
})

export const emailChangeBodySchema = z.object({
  newEmail: z.string().trim().email().transform(v => v.toLowerCase()),
  currentPassword: z.string().min(1),
})

export const emailChangeVerifyBodySchema = z.object({
  token: z.string().min(1),
})

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    newPasswordConfirmation: z.string().min(1),
  })
  .refine(d => d.newPassword === d.newPasswordConfirmation, {
    message: 'Both passwords need to match',
    path: ['newPasswordConfirmation'],
  })

export const sessionSummarySchema = z.object({
  id: z.string(),
  isCurrent: z.boolean(),
  description: z.string(),
  browserName: z.string().nullable(),
  browserMajorVersion: z.number().int().nullable(),
  operatingSystem: z.string().nullable(),
  deviceType: z.enum(['desktop', 'phone', 'tablet', 'unknown']).nullable(),
  deviceLabel: z.string().nullable(),
  approximateLocation: z.string().nullable(),
  locationUnavailable: z.boolean(),
  lastActivityAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  status: z.enum(['active', 'expired', 'revoked']),
})

export const revokeSessionResultSchema = z.object({
  message: z.string(),
  revokedCurrent: z.boolean(),
})

export const logoutDevicesResultSchema = z.object({
  message: z.string(),
  revokedCount: z.number().int().nonnegative(),
})

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email().transform(v => v.toLowerCase()),
})

export const forgotPasswordResponseSchema = z.object({
  message: z.string(),
})

export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    newPasswordConfirmation: z.string().min(1),
  })
  .refine(d => d.newPassword === d.newPasswordConfirmation, {
    message: 'Both passwords need to match',
    path: ['newPasswordConfirmation'],
  })

export const resetPasswordResultSchema = z.object({
  result: z.enum(['success', 'expired', 'used', 'invalid']),
  message: z.string(),
})

export const passwordResetInspectResultSchema = z.object({
  result: z.enum(['valid', 'expired', 'used', 'invalid']),
  message: z.string(),
})

export const sessionListSchema = z.object({
  sessions: z.array(sessionSummarySchema),
})

export const notificationPreferencesSchema = z.object({
  securityAccount: z.literal(true),
  bookingTrip: z.boolean(),
  providerMessages: z.boolean(),
  communityActivity: z.boolean(),
  productUpdates: z.boolean(),
  marketing: z.boolean(),
  inApp: z.boolean(),
  marketingOptInAt: z.string().datetime().nullable(),
})

export const notificationPreferencesPatchSchema = z
  .object({
    bookingTrip: z.boolean().optional(),
    providerMessages: z.boolean().optional(),
    communityActivity: z.boolean().optional(),
    productUpdates: z.boolean().optional(),
    marketing: z.boolean().optional(),
    inApp: z.boolean().optional(),
    securityAccount: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.securityAccount === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['securityAccount'],
        message: 'Security and account emails cannot be disabled',
      })
    }
  })

export const deactivateBodySchema = z.object({
  currentPassword: z.string().min(1),
  confirm: z.literal(true),
})

export type TravelerProfileDto = z.infer<typeof travelerProfileSchema>
export type OnboardingPatch = z.infer<typeof onboardingPatchSchema>
export type OnboardingComplete = z.infer<typeof onboardingCompleteSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>
export type SessionSummary = z.infer<typeof sessionSummarySchema>
export type RevokeSessionResult = z.infer<typeof revokeSessionResultSchema>
export type LogoutDevicesResult = z.infer<typeof logoutDevicesResultSchema>
export type ResetPasswordResult = z.infer<typeof resetPasswordResultSchema>
export type PasswordResetInspectResult = z.infer<typeof passwordResetInspectResultSchema>
export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>
