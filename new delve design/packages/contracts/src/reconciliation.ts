import { z } from 'zod'

export const reconciliationRunStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED',
])

export const reconciliationIssueStatusSchema = z.enum(['OPEN', 'AUTO_RESOLVED', 'MANUALLY_RESOLVED', 'IGNORED'])

export const reconciliationSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL'])

export const unmatchedFinancialEventStatusSchema = z.enum(['OPEN', 'MATCHED', 'REVIEWED'])

export const financialRecoveryCaseStatusSchema = z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'WRITTEN_OFF'])

export const reconciliationRunScopeSchema = z.enum(['STALE', 'PAYMENT', 'BOOKING', 'GLOBAL_RECENT'])

export const startReconciliationBodySchema = z
  .object({
    scope: reconciliationRunScopeSchema.default('STALE'),
    paymentId: z.string().min(1).optional(),
    bookingId: z.string().min(1).optional(),
  })
  .strict()

export const resolveReconciliationIssueBodySchema = z
  .object({
    resolutionType: z.enum(['MANUALLY_RESOLVED', 'IGNORED']),
    note: z.string().trim().max(2000).optional(),
  })
  .strict()

export const resolveRecoveryCaseBodySchema = z
  .object({
    status: z.enum(['RESOLVED', 'WRITTEN_OFF', 'UNDER_REVIEW']),
    note: z.string().trim().max(4000).optional(),
  })
  .strict()

export const reconciliationRunDtoSchema = z.object({
  id: z.string(),
  scope: z.string(),
  status: reconciliationRunStatusSchema,
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  recordsChecked: z.number(),
  mismatchesFound: z.number(),
  recoveriesApplied: z.number(),
  errorsCount: z.number(),
  triggeredByType: z.string(),
  createdAt: z.string().datetime(),
})

export const reconciliationIssueListItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: reconciliationSeveritySchema,
  status: reconciliationIssueStatusSchema,
  code: z.string(),
  summary: z.string(),
  bookingId: z.string().nullable(),
  bookingReference: z.string().nullable(),
  businessId: z.string().nullable(),
  stripeObjectId: z.string().nullable(),
  detectedAt: z.string().datetime(),
  lastDetectedAt: z.string().datetime(),
})

export const reconciliationIssueDtoSchema = reconciliationIssueListItemSchema.extend({
  fingerprint: z.string(),
  runId: z.string().nullable(),
  paymentId: z.string().nullable(),
  businessPayableId: z.string().nullable(),
  refundId: z.string().nullable(),
  transferReversalId: z.string().nullable(),
  disputeId: z.string().nullable(),
  stripeObjectType: z.string().nullable(),
  recommendedAction: z.string().nullable(),
  localState: z.string().nullable(),
  stripeState: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolutionType: z.string().nullable(),
  resolutionNote: z.string().nullable(),
})

export const unmatchedStripeEventDtoSchema = z.object({
  id: z.string(),
  providerEventId: z.string(),
  eventType: z.string(),
  stripeObjectId: z.string().nullable(),
  chargeId: z.string().nullable(),
  paymentIntentId: z.string().nullable(),
  note: z.string(),
  status: unmatchedFinancialEventStatusSchema,
  createdAt: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
})

export const financialRecoveryCaseDtoSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: financialRecoveryCaseStatusSchema,
  amount: z.string(),
  currency: z.string(),
  reason: z.string(),
  businessId: z.string(),
  bookingId: z.string().nullable(),
  bookingReference: z.string().nullable(),
  paymentId: z.string().nullable(),
  businessPayableId: z.string().nullable(),
  disputeId: z.string().nullable(),
  transferReversalId: z.string().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
})

export const reconciliationSummaryDtoSchema = z.object({
  openIssues: z.number(),
  criticalIssues: z.number(),
  unmatchedEvents: z.number(),
  openRecoveryCases: z.number(),
  lastRun: reconciliationRunDtoSchema.nullable(),
})

export const bookingFinancialChainDtoSchema = z.object({
  bookingId: z.string(),
  bookingReference: z.string(),
  bookingStatus: z.string(),
  issues: z.array(reconciliationIssueListItemSchema),
  recoveriesApplied: z.number(),
})

export type ReconciliationRunDto = z.infer<typeof reconciliationRunDtoSchema>
export type ReconciliationIssueListItem = z.infer<typeof reconciliationIssueListItemSchema>
export type ReconciliationIssueDto = z.infer<typeof reconciliationIssueDtoSchema>
export type UnmatchedStripeEventDto = z.infer<typeof unmatchedStripeEventDtoSchema>
export type FinancialRecoveryCaseDto = z.infer<typeof financialRecoveryCaseDtoSchema>
export type ReconciliationSummaryDto = z.infer<typeof reconciliationSummaryDtoSchema>
export type BookingFinancialChainDto = z.infer<typeof bookingFinancialChainDtoSchema>
export type StartReconciliationBody = z.infer<typeof startReconciliationBodySchema>
export type ResolveReconciliationIssueBody = z.infer<typeof resolveReconciliationIssueBodySchema>
export type ResolveRecoveryCaseBody = z.infer<typeof resolveRecoveryCaseBodySchema>
