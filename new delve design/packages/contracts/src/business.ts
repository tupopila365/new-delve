import { z } from 'zod'

export const businessStatusSchema = z.enum([
  'DRAFT',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
])

export const businessMemberRoleSchema = z.enum(['OWNER', 'MANAGER', 'CONTENT_EDITOR'])

/** Create body — no ownerUserId, role, or status (server assigns OWNER + DRAFT). */
export const createBusinessBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(2000).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().max(40).optional(),
    website: z.string().trim().url().max(500).optional(),
    city: z.string().trim().max(100).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((v) => v.toUpperCase())
      .optional(),
    address: z.string().trim().max(300).optional(),
    category: z.string().trim().max(80).optional(),
  })
  .strict()

/** Update body — no status/role escalation via PATCH. */
export const updateBusinessBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    email: z.union([z.string().trim().email().max(254), z.null()]).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    website: z.union([z.string().trim().url().max(500), z.null()]).optional(),
    city: z.string().trim().max(100).nullable().optional(),
    countryCode: z
      .union([
        z
          .string()
          .trim()
          .length(2)
          .transform((v) => v.toUpperCase()),
        z.null(),
      ])
      .optional(),
    address: z.string().trim().max(300).nullable().optional(),
    category: z.string().trim().max(80).nullable().optional(),
    logoUrl: z.union([z.string().trim().url().max(2000), z.null()]).optional(),
    coverUrl: z.union([z.string().trim().url().max(2000), z.null()]).optional(),
  })
  .strict()

export const businessAreaDtoSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createBusinessAreaBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().max(2000).optional(),
    logoUrl: z.string().trim().url().max(2000).optional(),
    coverUrl: z.string().trim().url().max(2000).optional(),
  })
  .strict()

export const updateBusinessAreaBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    logoUrl: z.union([z.string().trim().url().max(2000), z.null()]).optional(),
    coverUrl: z.union([z.string().trim().url().max(2000), z.null()]).optional(),
  })
  .strict()

export const businessDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  address: z.string().nullable(),
  category: z.string().nullable(),
  areas: z.array(businessAreaDtoSchema).default([]),
  status: businessStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/**
 * Traveler-facing public business profile.
 * Omits email, phone, and other internal contact fields.
 * Only VERIFIED businesses are returned by the public API.
 */
export const businessPublicDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  website: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  address: z.string().nullable(),
  category: z.string().nullable(),
  areas: z.array(businessAreaDtoSchema).default([]),
  /** Always VERIFIED on public responses. */
  status: z.literal('VERIFIED'),
  createdAt: z.string().datetime(),
})

export const businessMembershipDtoSchema = z.object({
  id: z.string(),
  role: businessMemberRoleSchema,
  createdAt: z.string().datetime(),
  business: businessDtoSchema,
})

/** Provider dashboard summary. Counts are real DB counts (0 until listing/deal/post models exist). */
export const businessDashboardDtoSchema = z.object({
  membership: businessMembershipDtoSchema.nullable(),
  profileCompletionPercent: z.number().int().min(0).max(100),
  listingCount: z.number().int().min(0),
  dealCount: z.number().int().min(0),
  postCount: z.number().int().min(0),
  bookingCount: z.number().int().min(0),
})

export type BusinessStatus = z.infer<typeof businessStatusSchema>
export type BusinessMemberRole = z.infer<typeof businessMemberRoleSchema>
export type CreateBusinessBody = z.infer<typeof createBusinessBodySchema>
export type UpdateBusinessBody = z.infer<typeof updateBusinessBodySchema>
export type BusinessAreaDto = z.infer<typeof businessAreaDtoSchema>
export type CreateBusinessAreaBody = z.infer<typeof createBusinessAreaBodySchema>
export type UpdateBusinessAreaBody = z.infer<typeof updateBusinessAreaBodySchema>
export type BusinessDto = z.infer<typeof businessDtoSchema>
export type BusinessPublicDto = z.infer<typeof businessPublicDtoSchema>
export type BusinessMembershipDto = z.infer<typeof businessMembershipDtoSchema>
export type BusinessDashboardDto = z.infer<typeof businessDashboardDtoSchema>
