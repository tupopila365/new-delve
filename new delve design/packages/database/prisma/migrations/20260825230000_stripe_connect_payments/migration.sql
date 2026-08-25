-- Stripe Connect (separate charges and transfers) + Payment + BusinessPayable.
-- Does not store bank account numbers, cards, or CVV.

CREATE TYPE "StripeConnectStatus" AS ENUM (
  'NOT_CONNECTED',
  'ONBOARDING',
  'RESTRICTED',
  'ACTIVE',
  'DISABLED'
);

CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "BusinessPayableStatus" AS ENUM (
  'PENDING',
  'ELIGIBLE',
  'TRANSFERRED'
);

ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_PAID';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';

ALTER TABLE "Business" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "Business" ADD COLUMN "stripeAccountStatus" "StripeConnectStatus" NOT NULL DEFAULT 'NOT_CONNECTED';
ALTER TABLE "Business" ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "stripeOnboardingCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Business_stripeAccountId_key" ON "Business"("stripeAccountId");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "stripePaymentIntentId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripeChargeId" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "processingAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_bookingId_status_idx" ON "Payment"("bookingId", "status");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_businessId_status_idx" ON "Payment"("businessId", "status");
CREATE UNIQUE INDEX "Payment_onePaid_perBooking" ON "Payment"("bookingId") WHERE "status" = 'PAID';

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BusinessPayable" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "status" "BusinessPayableStatus" NOT NULL DEFAULT 'PENDING',
  "grossAmount" DECIMAL(12, 2) NOT NULL,
  "platformFeeAmount" DECIMAL(12, 2) NOT NULL,
  "netAmount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "stripeTransferId" TEXT,
  "transferGroup" TEXT NOT NULL,
  "eligibleAt" TIMESTAMP(3),
  "transferredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessPayable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessPayable_bookingId_key" ON "BusinessPayable"("bookingId");
CREATE UNIQUE INDEX "BusinessPayable_paymentId_key" ON "BusinessPayable"("paymentId");
CREATE UNIQUE INDEX "BusinessPayable_stripeTransferId_key" ON "BusinessPayable"("stripeTransferId");
CREATE INDEX "BusinessPayable_businessId_status_idx" ON "BusinessPayable"("businessId", "status");
CREATE INDEX "BusinessPayable_status_createdAt_idx" ON "BusinessPayable"("status", "createdAt");

ALTER TABLE "BusinessPayable" ADD CONSTRAINT "BusinessPayable_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessPayable" ADD CONSTRAINT "BusinessPayable_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessPayable" ADD CONSTRAINT "BusinessPayable_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");
CREATE INDEX "PaymentWebhookEvent_createdAt_idx" ON "PaymentWebhookEvent"("createdAt");
