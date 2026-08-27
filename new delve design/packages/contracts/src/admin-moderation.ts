import { z } from 'zod'
import { adminPaginatedSchema } from './admin-marketplace.js'
import { adminAccountStatusSchema } from './admin-travelers.js'

export const contentReportTargetTypeSchema = z.enum(['POST', 'EVENT', 'JOURNEY', 'POST_COMMENT'])
export const adminModerationTargetTypeSchema = z.enum([
  'POST',
  'EVENT',
  'JOURNEY',
  'COMMUNITY',
  'COMMUNITY_THREAD',
  'POST_COMMENT',
  'COMMUNITY_COMMENT',
])
export const contentReportReasonSchema = z.enum([
  'SPAM',
  'SCAM_OR_FRAUD',
  'HARASSMENT',
  'HATE_OR_ABUSE',
  'SEXUAL_CONTENT',
  'VIOLENCE_OR_THREATS',
  'MISLEADING_INFORMATION',
  'ILLEGAL_OR_DANGEROUS',
  'PRIVACY',
  'IMPERSONATION',
  'COMMUNITY_RULE_VIOLATION',
  'OTHER',
])
export const contentReportStatusSchema = z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'])
export const contentModerationStatusSchema = z.enum(['VISIBLE', 'HIDDEN', 'REMOVED'])
export const contentModerationActionTypeSchema = z.enum([
  'NO_ACTION',
  'HIDE',
  'REMOVE',
  'RESTORE',
  'PLATFORM_RESTRICT',
])

export type ContentReportTargetType = z.infer<typeof contentReportTargetTypeSchema>
export type AdminModerationTargetType = z.infer<typeof adminModerationTargetTypeSchema>
export type ContentReportReason = z.infer<typeof contentReportReasonSchema>
export type ContentReportStatus = z.infer<typeof contentReportStatusSchema>
export type ContentModerationStatus = z.infer<typeof contentModerationStatusSchema>
export type ContentModerationActionType = z.infer<typeof contentModerationActionTypeSchema>

export const createContentReportBodySchema = z
  .object({
    targetType: contentReportTargetTypeSchema,
    targetId: z.string().min(1).max(64),
    reason: contentReportReasonSchema,
    details: z.string().trim().max(2000).optional().nullable(),
  })
  .strict()

export type CreateContentReportBody = z.infer<typeof createContentReportBodySchema>

export const createContentReportResultSchema = z.object({
  message: z.string(),
})

export type CreateContentReportResult = z.infer<typeof createContentReportResultSchema>

export const adminModerationDecisionBodySchema = z
  .object({
    action: contentModerationActionTypeSchema,
    reason: contentReportReasonSchema.optional(),
    note: z.string().trim().max(500).optional().nullable(),
    reportResolution: z.enum(['RESOLVED', 'DISMISSED']).optional(),
    expectedModerationStatus: contentModerationStatusSchema.optional().nullable(),
  })
  .strict()

export type AdminModerationDecisionBody = z.infer<typeof adminModerationDecisionBodySchema>

export const adminModerationQueueItemSchema = z.object({
  targetType: adminModerationTargetTypeSchema,
  targetId: z.string(),
  preview: z.string(),
  creatorUserId: z.string().nullable(),
  creatorUsername: z.string().nullable(),
  creatorDisplayName: z.string().nullable(),
  creatorAccountStatus: adminAccountStatusSchema.nullable(),
  contextLabel: z.string().nullable(),
  openReportCount: z.number().int().min(0),
  topReasons: z.array(z.string()),
  firstReportedAt: z.string().datetime(),
  latestReportedAt: z.string().datetime(),
  contentStatus: z.string(),
  source: z.enum(['CONTENT_REPORT', 'COMMUNITY_REPORT', 'MIXED']),
})

export type AdminModerationQueueItem = z.infer<typeof adminModerationQueueItemSchema>
export const adminModerationQueueDtoSchema = adminPaginatedSchema(adminModerationQueueItemSchema)
export type AdminModerationQueueDto = z.infer<typeof adminModerationQueueDtoSchema>

export const adminContentReportRowSchema = z.object({
  id: z.string(),
  source: z.enum(['CONTENT_REPORT', 'COMMUNITY_REPORT']),
  reason: z.string(),
  details: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
  reportedTextSnapshot: z.string().nullable(),
  reporterUsername: z.string(),
  reporterDisplayName: z.string().nullable(),
  communityRuleTitle: z.string().nullable(),
})

export type AdminContentReportRow = z.infer<typeof adminContentReportRowSchema>

export const adminModerationActionRowSchema = z.object({
  id: z.string(),
  action: contentModerationActionTypeSchema,
  reason: contentReportReasonSchema.nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export const adminModerationDetailSchema = z.object({
  targetType: adminModerationTargetTypeSchema,
  targetId: z.string(),
  preview: z.string(),
  body: z.string().nullable(),
  mediaUrls: z.array(z.string()),
  createdAt: z.string().datetime().nullable(),
  visibility: z.string().nullable(),
  contentStatus: z.string(),
  moderationStatus: contentModerationStatusSchema.nullable(),
  creatorUserId: z.string().nullable(),
  creatorUsername: z.string().nullable(),
  creatorDisplayName: z.string().nullable(),
  creatorAccountStatus: adminAccountStatusSchema.nullable(),
  creatorRemovedContentCount: z.number().int().min(0),
  creatorResolvedReportCount: z.number().int().min(0),
  context: z.object({
    communityId: z.string().nullable(),
    communityName: z.string().nullable(),
    communitySlug: z.string().nullable(),
    location: z.string().nullable(),
    startAt: z.string().datetime().nullable(),
    memberRole: z.string().nullable(),
    parentId: z.string().nullable(),
    parentLabel: z.string().nullable(),
  }),
  communityRules: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })),
  communityAudit: z.array(z.object({ action: z.string(), createdAt: z.string().datetime() })),
  reports: z.array(adminContentReportRowSchema),
  history: z.array(adminModerationActionRowSchema),
  allowedActions: z.array(contentModerationActionTypeSchema),
  creatorContentCount: z.number().int().min(0),
  creatorPriorRemovals: z.number().int().min(0),
  creatorOpenReports: z.number().int().min(0),
  policyContext: z.object({
    facts: z.array(z.string()),
    recommendation: z.string().nullable(),
  }),
})

export type AdminModerationDetail = z.infer<typeof adminModerationDetailSchema>

export const adminModerationOpsSummarySchema = z.object({
  period: z.enum(['today', '7d', '30d', 'month']),
  openReportCount: z.number().int().min(0),
  underReviewCount: z.number().int().min(0),
  needsReviewCount: z.number().int().min(0),
  repeatTargetCount: z.number().int().min(0),
  resolvedCount: z.number().int().min(0),
  dismissedCount: z.number().int().min(0),
  resolvedTodayCount: z.number().int().min(0),
  hiddenOrRemovedCount: z.number().int().min(0),
  postsRemovedCount: z.number().int().min(0),
  commentsRemovedCount: z.number().int().min(0),
  eventsRemovedCount: z.number().int().min(0),
  journeysRemovedCount: z.number().int().min(0),
  restorationsCount: z.number().int().min(0),
  communityOpenReportCount: z.number().int().min(0),
  upcomingEventsWithReports: z.number().int().min(0),
  oldestOpenReportAgeSeconds: z.number().int().min(0).nullable(),
  reasonCounts: z.array(z.object({ reason: z.string(), count: z.number().int().min(0) })),
})

export type AdminModerationOpsSummary = z.infer<typeof adminModerationOpsSummarySchema>

export const adminPostSummarySchema = z.object({
  id: z.string(),
  captionPreview: z.string(),
  authorUsername: z.string(),
  authorDisplayName: z.string().nullable(),
  createdAt: z.string().datetime(),
  mediaCount: z.number().int().min(0),
  likeCount: z.number().int().min(0),
  commentCount: z.number().int().min(0),
  openReportCount: z.number().int().min(0),
  visibility: z.string(),
  moderationStatus: contentModerationStatusSchema,
  authorDeleted: z.boolean(),
})

export type AdminPostSummary = z.infer<typeof adminPostSummarySchema>
export const adminPostListDtoSchema = adminPaginatedSchema(adminPostSummarySchema)
export type AdminPostListDto = z.infer<typeof adminPostListDtoSchema>

export const adminEventModerationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  creatorUsername: z.string(),
  startAt: z.string().datetime(),
  location: z.string().nullable(),
  status: z.string(),
  moderationStatus: contentModerationStatusSchema,
  attendanceCount: z.number().int().min(0),
  openReportCount: z.number().int().min(0),
  communityName: z.string().nullable(),
  occurringSoon: z.boolean(),
})

export type AdminEventModerationSummary = z.infer<typeof adminEventModerationSummarySchema>
export const adminEventModerationListDtoSchema = adminPaginatedSchema(adminEventModerationSummarySchema)

export const adminJourneyModerationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  authorUsername: z.string(),
  destination: z.string(),
  visibility: z.string(),
  moderationStatus: contentModerationStatusSchema,
  openReportCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  reported: z.boolean(),
})

export type AdminJourneyModerationSummary = z.infer<typeof adminJourneyModerationSummarySchema>
export const adminJourneyModerationListDtoSchema = adminPaginatedSchema(adminJourneyModerationSummarySchema)

export const adminCommunityModerationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  privacy: z.string(),
  memberCount: z.number().int().min(0),
  moderationStatus: contentModerationStatusSchema,
  openReportCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
})

export type AdminCommunityModerationSummary = z.infer<typeof adminCommunityModerationSummarySchema>
export const adminCommunityModerationListDtoSchema = adminPaginatedSchema(adminCommunityModerationSummarySchema)

export const adminCommentModerationSummarySchema = z.object({
  id: z.string(),
  bodyPreview: z.string(),
  authorUsername: z.string(),
  postId: z.string(),
  createdAt: z.string().datetime(),
  moderationStatus: contentModerationStatusSchema,
  authorDeleted: z.boolean(),
  openReportCount: z.number().int().min(0),
})
export type AdminCommentModerationSummary = z.infer<typeof adminCommentModerationSummarySchema>
export const adminCommentModerationListDtoSchema = adminPaginatedSchema(adminCommentModerationSummarySchema)

export const adminTravelerSafetyHistorySchema = z.object({
  openReportsAgainstContent: z.number().int().min(0),
  resolvedReportCount: z.number().int().min(0),
  dismissedReportCount: z.number().int().min(0),
  postsRemoved: z.number().int().min(0),
  commentsRemoved: z.number().int().min(0),
  eventsRemoved: z.number().int().min(0),
  journeysRemoved: z.number().int().min(0),
  communityActions: z.number().int().min(0),
  removedLast30Days: z.number().int().min(0),
  priorAccountRestrictions: z.number().int().min(0),
  accountStatus: adminAccountStatusSchema,
  actions: z.array(
    z.object({
      id: z.string(),
      targetType: adminModerationTargetTypeSchema,
      targetId: z.string(),
      action: contentModerationActionTypeSchema,
      createdAt: z.string().datetime(),
    }),
  ),
  policyContext: z.object({
    facts: z.array(z.string()),
    recommendation: z.string().nullable(),
  }),
})
export type AdminTravelerSafetyHistory = z.infer<typeof adminTravelerSafetyHistorySchema>
