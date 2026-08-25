-- Settlement lifecycle + commission field names. Does not store bank details.

ALTER TYPE "BusinessPayableStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "BusinessPayableStatus" ADD VALUE 'BLOCKED';
ALTER TYPE "BusinessPayableStatus" ADD VALUE 'CANCELLED';

ALTER TYPE "NotificationType" ADD VALUE 'SETTLEMENT_ELIGIBLE';
ALTER TYPE "NotificationType" ADD VALUE 'SETTLEMENT_TRANSFERRED';

ALTER TABLE "BusinessPayable" RENAME COLUMN "platformFeeAmount" TO "platformCommissionAmount";
ALTER TABLE "BusinessPayable" RENAME COLUMN "netAmount" TO "businessNetAmount";

ALTER TABLE "BusinessPayable" ADD COLUMN "stripeFeeAmount" DECIMAL(12, 2);
ALTER TABLE "BusinessPayable" ADD COLUMN "eligibilityCode" TEXT;
ALTER TABLE "BusinessPayable" ADD COLUMN "lastFailureCode" TEXT;
ALTER TABLE "BusinessPayable" ADD COLUMN "lastFailureMessage" TEXT;
ALTER TABLE "BusinessPayable" ADD COLUMN "processingAt" TIMESTAMP(3);
ALTER TABLE "BusinessPayable" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "BusinessPayable" ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE TABLE "SettlementAttempt" (
  "id" TEXT NOT NULL,
  "payableId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "stripeTransferId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SettlementAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SettlementAttempt_payableId_createdAt_idx" ON "SettlementAttempt"("payableId", "createdAt");

ALTER TABLE "SettlementAttempt" ADD CONSTRAINT "SettlementAttempt_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "BusinessPayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
