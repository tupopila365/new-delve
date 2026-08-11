import { z } from 'zod'

export const mediaStatusSchema = z.enum([
  'PENDING',
  'UPLOADING',
  'PROCESSING',
  'READY',
  'FAILED',
  'DELETION_PENDING',
  'DELETED',
])

export const mediaPurposeSchema = z.enum([
  'avatar',
  'post',
  'review',
  'business_profile',
  'listing',
  'message',
])

export const mediaResourceTypeSchema = z.enum(['image', 'video', 'raw', 'auto'])

export const mediaUploadSignatureBodySchema = z
  .object({
    purpose: mediaPurposeSchema,
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(128),
    bytes: z.number().int().positive(),
    businessId: z.string().min(1).optional(),
    listingId: z.string().min(1).optional(),
  })
  .strict()

export const mediaUploadSignatureResponseSchema = z.object({
  uploadIntentId: z.string(),
  cloudName: z.string(),
  apiKey: z.string(),
  timestamp: z.number().int(),
  signature: z.string(),
  uploadUrl: z.string().url(),
  folder: z.string(),
  resourceType: mediaResourceTypeSchema,
  allowedFormats: z.array(z.string()),
  maxBytes: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  /** Parameters the browser must include when posting to Cloudinary (never includes api_secret). */
  requiredParams: z.record(z.string()),
  /** Single-use token returned by Delve; send back on /media/complete as `signature`. */
  completionToken: z.string(),
  chunkThresholdBytes: z.number().int().positive().optional(),
  chunkSizeBytes: z.number().int().positive().optional(),
})

export const mediaCompleteBodySchema = z
  .object({
    uploadIntentId: z.string().min(1),
    publicId: z.string().min(1),
    cloudinaryAssetId: z.string().min(1).optional(),
    version: z.number().int().positive().optional(),
    resourceType: mediaResourceTypeSchema,
    format: z.string().min(1).max(32),
    bytes: z.number().int().nonnegative(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    duration: z.number().nonnegative().optional(),
    secureUrl: z.string().url().optional(),
    /** Cloudinary-style signature over returned fields (excluding secret). */
    signature: z.string().min(1),
    altText: z.string().trim().max(500).optional(),
  })
  .strict()

export const mediaAssetSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  version: z.number().int().nullable(),
  resourceType: mediaResourceTypeSchema,
  format: z.string().nullable(),
  bytes: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  duration: z.number().nullable(),
  status: mediaStatusSchema,
  purpose: mediaPurposeSchema,
  altText: z.string().nullable(),
  delivery: z.object({
    /** Ready-to-use CDN URL from the shared builder (not a raw original unless needed). */
    url: z.string(),
    srcSet: z.string().optional(),
    sizes: z.string().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
  }),
  createdAt: z.string().datetime(),
})

export const mediaDeleteResponseSchema = z.object({
  id: z.string(),
  status: mediaStatusSchema,
  message: z.string(),
})

export const mediaUploadErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
  'INVALID_FILE_TYPE',
  'FILE_TOO_LARGE',
  'QUOTA_EXCEEDED',
  'CLOUDINARY_NOT_CONFIGURED',
  'INTENT_EXPIRED',
  'INTENT_USED',
  'INTENT_NOT_FOUND',
  'SIGNATURE_INVALID',
  'TAMPERED_METADATA',
  'NOT_FOUND',
  'DELETION_FAILED',
  'PURPOSE_NOT_AVAILABLE',
])

export type MediaStatus = z.infer<typeof mediaStatusSchema>
export type MediaPurpose = z.infer<typeof mediaPurposeSchema>
export type MediaResourceType = z.infer<typeof mediaResourceTypeSchema>
export type MediaUploadSignatureBody = z.infer<typeof mediaUploadSignatureBodySchema>
export type MediaUploadSignatureResponse = z.infer<typeof mediaUploadSignatureResponseSchema>
export type MediaCompleteBody = z.infer<typeof mediaCompleteBodySchema>
export type MediaAssetDto = z.infer<typeof mediaAssetSchema>
export type MediaDeleteResponse = z.infer<typeof mediaDeleteResponseSchema>
