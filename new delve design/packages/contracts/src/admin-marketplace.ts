import { z } from 'zod'
import { businessMemberRoleSchema, businessStatusSchema } from './business.js'
import { listingMediaDtoSchema, listingPricingDtoSchema, listingStatusSchema } from './listing.js'
import { stripeConnectStatusSchema } from './payment.js'
import { currencyFinancialSummarySchema, reportPeriodDtoSchema } from './financial-report.js'

export const adminPageSizeSchema = z.union([z.literal(25), z.literal(50), z.literal(100)])

export const adminPaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: adminPageSizeSchema,
    total: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  })

export const adminConnectSafeDtoSchema = z.object({
  status: stripeConnectStatusSchema,
  chargesEnabled: z.boolean(),
  payoutsEnabled: z.boolean(),
  detailsSubmitted: z.boolean(),
  settlementReady: z.boolean(),
  label: z.string(),
})

export type AdminConnectSafeDto = z.infer<typeof adminConnectSafeDtoSchema>

export const adminBusinessListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  category: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  status: businessStatusSchema,
  listingCount: z.number().int().min(0),
  publishedDealCount: z.number().int().min(0),
  bookingCount: z.number().int().min(0),
  connect: adminConnectSafeDtoSchema,
  createdAt: z.string().datetime(),
})

export type AdminBusinessListItem = z.infer<typeof adminBusinessListItemSchema>

export const adminBusinessListDtoSchema = adminPaginatedSchema(adminBusinessListItemSchema)
export type AdminBusinessListDto = z.infer<typeof adminBusinessListDtoSchema>

export const adminBusinessMemberSchema = z.object({
  id: z.string(),
  role: businessMemberRoleSchema,
  createdAt: z.string().datetime(),
  username: z.string(),
  displayName: z.string().nullable(),
  email: z.string().email(),
})

export type AdminBusinessMember = z.infer<typeof adminBusinessMemberSchema>

export const adminBusinessMarketplaceSummarySchema = z.object({
  listingCount: z.number().int().min(0),
  publishedListingCount: z.number().int().min(0),
  dealCount: z.number().int().min(0),
  publishedDealCount: z.number().int().min(0),
  bookingCount: z.number().int().min(0),
  completedBookingCount: z.number().int().min(0),
})

export type AdminBusinessMarketplaceSummary = z.infer<typeof adminBusinessMarketplaceSummarySchema>

export const adminAttentionItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  tone: z.enum(['info', 'warning', 'critical']),
})

export type AdminAttentionItem = z.infer<typeof adminAttentionItemSchema>

export const adminBusinessDetailSchema = z.object({
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
  status: businessStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  connect: adminConnectSafeDtoSchema,
  marketplace: adminBusinessMarketplaceSummarySchema,
  owner: adminBusinessMemberSchema.nullable(),
  memberCount: z.number().int().min(0),
  attention: z.array(adminAttentionItemSchema),
  canVerify: z.boolean(),
  canRejectVerification: z.boolean(),
})

export type AdminBusinessDetail = z.infer<typeof adminBusinessDetailSchema>

export const adminBusinessFinanceDtoSchema = z.object({
  period: reportPeriodDtoSchema,
  byCurrency: z.array(currencyFinancialSummarySchema),
})

export type AdminBusinessFinanceDto = z.infer<typeof adminBusinessFinanceDtoSchema>

export const adminBusinessActivityItemSchema = z.object({
  kind: z.enum(['PAYMENT', 'SETTLEMENT', 'REFUND', 'DISPUTE', 'REVERSAL', 'RECOVERY']),
  id: z.string(),
  label: z.string(),
  status: z.string(),
  amount: z.string().nullable(),
  currency: z.string().nullable(),
  at: z.string().datetime().nullable(),
  href: z.string().nullable(),
})

export type AdminBusinessActivityItem = z.infer<typeof adminBusinessActivityItemSchema>

export const adminBusinessActivityDtoSchema = z.object({
  items: z.array(adminBusinessActivityItemSchema),
})

export type AdminBusinessActivityDto = z.infer<typeof adminBusinessActivityDtoSchema>

export const adminMarketplaceOpsSummarySchema = z.object({
  pendingVerificationCount: z.number().int().min(0),
  stripeSetupIssueCount: z.number().int().min(0),
})

export type AdminMarketplaceOpsSummary = z.infer<typeof adminMarketplaceOpsSummarySchema>

export const adminListingListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: listingStatusSchema,
  pricing: listingPricingDtoSchema.nullable(),
  businessId: z.string(),
  businessName: z.string(),
  businessStatus: businessStatusSchema,
  dealCount: z.number().int().min(0),
  bookingCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AdminListingListItem = z.infer<typeof adminListingListItemSchema>

export const adminListingListDtoSchema = adminPaginatedSchema(adminListingListItemSchema)
export type AdminListingListDto = z.infer<typeof adminListingListDtoSchema>

export const adminListingDetailSchema = adminListingListItemSchema.extend({
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  media: z.array(listingMediaDtoSchema),
})

export type AdminListingDetail = z.infer<typeof adminListingDetailSchema>
