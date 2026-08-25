-- Reporting indexes only. Does not store new financial facts or move money.

CREATE INDEX "Booking_businessId_createdAt_idx" ON "Booking"("businessId", "createdAt");
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");
CREATE INDEX "BusinessPayable_businessId_status_createdAt_idx" ON "BusinessPayable"("businessId", "status", "createdAt");
CREATE INDEX "BusinessPayable_status_transferredAt_idx" ON "BusinessPayable"("status", "transferredAt");
CREATE INDEX "Refund_status_succeededAt_idx" ON "Refund"("status", "succeededAt");
CREATE INDEX "TransferReversal_status_succeededAt_idx" ON "TransferReversal"("status", "succeededAt");
CREATE INDEX "FinancialReconciliationIssue_paymentId_status_severity_idx" ON "FinancialReconciliationIssue"("paymentId", "status", "severity");
