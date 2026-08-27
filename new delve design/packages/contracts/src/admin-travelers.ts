import { z } from 'zod'
import { adminPaginatedSchema } from './admin-marketplace.js'

export const adminAccountStatusSchema = z.enum([
  'pending_verification',
  'active',
  'restricted',
  'disabled',
  'deactivated',
])

export type AdminAccountStatus = z.infer<typeof adminAccountStatusSchema>

export const adminTravelerListItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  homeCity: z.string().nullable(),
  homeCountryCode: z.string().nullable(),
  accountStatus: adminAccountStatusSchema,
  bookingCount: z.number().int().min(0),
  claimCount: z.number().int().min(0),
  journeyCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  attention: z.boolean(),
})

export type AdminTravelerListItem = z.infer<typeof adminTravelerListItemSchema>
export const adminTravelerListDtoSchema = adminPaginatedSchema(adminTravelerListItemSchema)
export type AdminTravelerListDto = z.infer<typeof adminTravelerListDtoSchema>

export const adminTravelerAttentionSchema = z.object({
  code: z.string(),
  label: z.string(),
  tone: z.enum(['info', 'warning', 'critical']),
})

export type AdminTravelerAttention = z.infer<typeof adminTravelerAttentionSchema>

export const adminTravelerMarketplaceSummarySchema = z.object({
  bookingCount: z.number().int().min(0),
  completedBookingCount: z.number().int().min(0),
  claimCount: z.number().int().min(0),
  redeemedClaimCount: z.number().int().min(0),
  journeyCount: z.number().int().min(0),
  eventCreatedCount: z.number().int().min(0),
  eventAttendingCount: z.number().int().min(0),
  communityCount: z.number().int().min(0),
  postCount: z.number().int().min(0),
})

export type AdminTravelerMarketplaceSummary = z.infer<typeof adminTravelerMarketplaceSummarySchema>

export const adminTravelerDetailSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  homeCity: z.string().nullable(),
  homeCountryCode: z.string().nullable(),
  preferredLanguage: z.string(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']),
  accountStatus: adminAccountStatusSchema,
  role: z.enum(['traveler', 'admin']),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
  marketplace: adminTravelerMarketplaceSummarySchema,
  attention: z.array(adminTravelerAttentionSchema),
  canRestrict: z.boolean(),
  canRestore: z.boolean(),
  safety: z.object({
    openReportsAgainstContent: z.number().int().min(0),
    removedContentCount: z.number().int().min(0),
    resolvedReportCount: z.number().int().min(0),
    commentsRemoved: z.number().int().min(0),
    removedLast30Days: z.number().int().min(0),
    priorAccountRestrictions: z.number().int().min(0),
  }),
})

export type AdminTravelerDetail = z.infer<typeof adminTravelerDetailSchema>

export const adminTravelerClaimSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.string(),
  dealId: z.string(),
  dealTitle: z.string(),
  businessId: z.string().nullable(),
  businessName: z.string().nullable(),
  titleSnapshot: z.string(),
  currencySnapshot: z.string(),
  originalPriceSnapshot: z.string().nullable(),
  dealPriceSnapshot: z.string().nullable(),
  savingAmountSnapshot: z.string().nullable(),
  discountSummarySnapshot: z.string(),
  termsSnapshot: z.string().nullable(),
  redemptionInstructionsSnapshot: z.string().nullable(),
  bookingId: z.string().nullable(),
  bookingReference: z.string().nullable(),
  claimedAt: z.string().datetime(),
  redeemedAt: z.string().datetime().nullable(),
})

export type AdminTravelerClaim = z.infer<typeof adminTravelerClaimSchema>
export const adminTravelerClaimListDtoSchema = adminPaginatedSchema(adminTravelerClaimSchema)
export type AdminTravelerClaimListDto = z.infer<typeof adminTravelerClaimListDtoSchema>

export const adminTravelerJourneySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  startPlace: z.string(),
  endPlace: z.string(),
  visibility: z.string(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  stopCount: z.number().int().min(0),
  linkedBookingCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
})

export type AdminTravelerJourney = z.infer<typeof adminTravelerJourneySchema>
export const adminTravelerJourneyListDtoSchema = adminPaginatedSchema(adminTravelerJourneySchema)
export type AdminTravelerJourneyListDto = z.infer<typeof adminTravelerJourneyListDtoSchema>

export const adminTravelerEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  relation: z.enum(['created', 'going', 'interested']),
  status: z.string(),
  locationName: z.string().nullable(),
  city: z.string().nullable(),
  startAt: z.string().datetime(),
})

export type AdminTravelerEvent = z.infer<typeof adminTravelerEventSchema>
export const adminTravelerEventListDtoSchema = adminPaginatedSchema(adminTravelerEventSchema)
export type AdminTravelerEventListDto = z.infer<typeof adminTravelerEventListDtoSchema>

export const adminTravelerCommunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER']),
  membershipStatus: z.string(),
  joinedAt: z.string().datetime(),
})

export type AdminTravelerCommunity = z.infer<typeof adminTravelerCommunitySchema>
export const adminTravelerCommunityListDtoSchema = adminPaginatedSchema(adminTravelerCommunitySchema)
export type AdminTravelerCommunityListDto = z.infer<typeof adminTravelerCommunityListDtoSchema>

export const adminTravelerActivityPostSchema = z.object({
  id: z.string(),
  captionPreview: z.string(),
  createdAt: z.string().datetime(),
  mediaCount: z.number().int().min(0),
  reactionCount: z.number().int().min(0),
  commentCount: z.number().int().min(0),
})

export const adminTravelerActivityDtoSchema = z.object({
  posts: adminPaginatedSchema(adminTravelerActivityPostSchema),
  commentCount: z.number().int().min(0),
  saveCount: z.number().int().min(0),
  followingCount: z.number().int().min(0),
  followerCount: z.number().int().min(0),
})

export type AdminTravelerActivityDto = z.infer<typeof adminTravelerActivityDtoSchema>

export const adminTravelerCurrencyFinanceSchema = z.object({
  currency: z.string(),
  paymentsPaid: z.string(),
  paymentCount: z.number().int().min(0),
  refundsSucceeded: z.string(),
  refundCount: z.number().int().min(0),
  disputesOpenAmount: z.string(),
  openDisputeCount: z.number().int().min(0),
})

export const adminTravelerPaymentRowSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  bookingReference: z.string(),
  amount: z.string(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  hasOpenDispute: z.boolean(),
})

export const adminTravelerRefundRowSchema = z.object({
  id: z.string(),
  bookingId: z.string().nullable(),
  bookingReference: z.string().nullable(),
  amount: z.string(),
  currency: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
  succeededAt: z.string().datetime().nullable(),
})

export const adminTravelerDisputeRowSchema = z.object({
  id: z.string(),
  bookingReference: z.string().nullable(),
  amount: z.string(),
  currency: z.string(),
  status: z.string(),
  evidenceDueAt: z.string().datetime().nullable(),
})

export const adminTravelerFinancialDtoSchema = z.object({
  byCurrency: z.array(adminTravelerCurrencyFinanceSchema),
  payments: z.array(adminTravelerPaymentRowSchema),
  refunds: z.array(adminTravelerRefundRowSchema),
  disputes: z.array(adminTravelerDisputeRowSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNext: z.boolean(),
})

export type AdminTravelerFinancialDto = z.infer<typeof adminTravelerFinancialDtoSchema>

export const adminTravelerOpsSummarySchema = z.object({
  travelerCount: z.number().int().min(0),
  newThisMonthCount: z.number().int().min(0),
  restrictedCount: z.number().int().min(0),
})

export type AdminTravelerOpsSummary = z.infer<typeof adminTravelerOpsSummarySchema>
