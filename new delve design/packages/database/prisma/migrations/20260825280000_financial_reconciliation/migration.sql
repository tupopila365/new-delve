-- Financial reconciliation + recovery tracking. Does not edit prior financial migrations.

CREATE TYPE "FinancialReconciliationRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED'
);

CREATE TYPE "FinancialReconciliationIssueStatus" AS ENUM (
  'OPEN',
  'AUTO_RESOLVED',
  'MANUALLY_RESOLVED',
  'IGNORED'
);

CREATE TYPE "FinancialReconciliationSeverity" AS ENUM (
  'INFO',
  'WARNING',
  'CRITICAL'
);

CREATE TYPE "UnmatchedFinancialEventStatus" AS ENUM (
  'OPEN',
  'MATCHED',
  'REVIEWED'
);

CREATE TYPE "FinancialRecoveryCaseStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'WRITTEN_OFF'
);

ALTER TABLE "Payment" ADD COLUMN "stripeFeeAmount" DECIMAL(12, 2);
ALTER TABLE "Payment" ADD COLUMN "stripeBalanceTransactionId" TEXT;
CREATE INDEX "Payment_status_updatedAt_idx" ON "Payment"("status", "updatedAt");

CREATE INDEX "BusinessPayable_status_updatedAt_idx" ON "BusinessPayable"("status", "updatedAt");
CREATE INDEX "Refund_status_updatedAt_idx" ON "Refund"("status", "updatedAt");
CREATE INDEX "TransferReversal_status_updatedAt_idx" ON "TransferReversal"("status", "updatedAt");

ALTER TABLE "PaymentDispute" ADD COLUMN "stripeFeeAmount" DECIMAL(12, 2);
CREATE INDEX "PaymentDispute_status_updatedAt_idx" ON "PaymentDispute"("status", "updatedAt");

CREATE INDEX "Business_stripeAccountStatus_updatedAt_idx" ON "Business"("stripeAccountStatus", "updatedAt");

ALTER TABLE "UnmatchedStripeFinancialEvent" ADD COLUMN "status" "UnmatchedFinancialEventStatus" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "UnmatchedStripeFinancialEvent" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "UnmatchedStripeFinancialEvent" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "UnmatchedStripeFinancialEvent" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "UnmatchedStripeFinancialEvent_status_createdAt_idx" ON "UnmatchedStripeFinancialEvent"("status", "createdAt");
ALTER TABLE "UnmatchedStripeFinancialEvent" ADD CONSTRAINT "UnmatchedStripeFinancialEvent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FinancialReconciliationRun" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "status" "FinancialReconciliationRunStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "recordsChecked" INTEGER NOT NULL DEFAULT 0,
  "mismatchesFound" INTEGER NOT NULL DEFAULT 0,
  "recoveriesApplied" INTEGER NOT NULL DEFAULT 0,
  "errorsCount" INTEGER NOT NULL DEFAULT 0,
  "triggeredByType" TEXT NOT NULL,
  "triggeredByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialReconciliationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialReconciliationRun_status_createdAt_idx" ON "FinancialReconciliationRun"("status", "createdAt");
CREATE INDEX "FinancialReconciliationRun_createdAt_idx" ON "FinancialReconciliationRun"("createdAt");
ALTER TABLE "FinancialReconciliationRun" ADD CONSTRAINT "FinancialReconciliationRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FinancialReconciliationIssue" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "runId" TEXT,
  "type" TEXT NOT NULL,
  "severity" "FinancialReconciliationSeverity" NOT NULL,
  "status" "FinancialReconciliationIssueStatus" NOT NULL DEFAULT 'OPEN',
  "paymentId" TEXT,
  "bookingId" TEXT,
  "businessId" TEXT,
  "businessPayableId" TEXT,
  "refundId" TEXT,
  "transferReversalId" TEXT,
  "disputeId" TEXT,
  "stripeObjectType" TEXT,
  "stripeObjectId" TEXT,
  "code" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "recommendedAction" TEXT,
  "localState" TEXT,
  "stripeState" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionType" TEXT,
  "resolutionNote" TEXT,

  CONSTRAINT "FinancialReconciliationIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialReconciliationIssue_fingerprint_key" ON "FinancialReconciliationIssue"("fingerprint");
CREATE INDEX "FinancialReconciliationIssue_status_severity_detectedAt_idx" ON "FinancialReconciliationIssue"("status", "severity", "detectedAt");
CREATE INDEX "FinancialReconciliationIssue_type_status_idx" ON "FinancialReconciliationIssue"("type", "status");
CREATE INDEX "FinancialReconciliationIssue_businessId_status_idx" ON "FinancialReconciliationIssue"("businessId", "status");
CREATE INDEX "FinancialReconciliationIssue_bookingId_idx" ON "FinancialReconciliationIssue"("bookingId");
CREATE INDEX "FinancialReconciliationIssue_code_status_idx" ON "FinancialReconciliationIssue"("code", "status");
ALTER TABLE "FinancialReconciliationIssue" ADD CONSTRAINT "FinancialReconciliationIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "FinancialReconciliationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FinancialRecoveryCase" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "paymentId" TEXT,
  "bookingId" TEXT,
  "businessPayableId" TEXT,
  "disputeId" TEXT,
  "transferReversalId" TEXT,
  "type" TEXT NOT NULL,
  "status" "FinancialRecoveryCaseStatus" NOT NULL DEFAULT 'OPEN',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,

  CONSTRAINT "FinancialRecoveryCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialRecoveryCase_fingerprint_key" ON "FinancialRecoveryCase"("fingerprint");
CREATE INDEX "FinancialRecoveryCase_businessId_status_idx" ON "FinancialRecoveryCase"("businessId", "status");
CREATE INDEX "FinancialRecoveryCase_status_createdAt_idx" ON "FinancialRecoveryCase"("status", "createdAt");
CREATE INDEX "FinancialRecoveryCase_paymentId_idx" ON "FinancialRecoveryCase"("paymentId");
CREATE INDEX "FinancialRecoveryCase_disputeId_idx" ON "FinancialRecoveryCase"("disputeId");
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_businessPayableId_fkey" FOREIGN KEY ("businessPayableId") REFERENCES "BusinessPayable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "PaymentDispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_transferReversalId_fkey" FOREIGN KEY ("transferReversalId") REFERENCES "TransferReversal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialRecoveryCase" ADD CONSTRAINT "FinancialRecoveryCase_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
