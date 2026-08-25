/** Canonical financial lock order: Payment → BusinessPayable → Refund → TransferReversal. */

export async function lockPaymentThenPayable(
  tx: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  paymentId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM "BusinessPayable" WHERE "paymentId" = ${paymentId} FOR UPDATE`
}

/** After Payment and BusinessPayable. Never lock Dispute before those rows. */
export async function lockPaymentDisputes(
  tx: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  paymentId: string,
) {
  await tx.$queryRaw`SELECT id FROM "PaymentDispute" WHERE "paymentId" = ${paymentId} FOR UPDATE`
}

export async function lockRefundRow(
  tx: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  refundId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Refund" WHERE id = ${refundId} FOR UPDATE`
}

export async function lockTransferReversalRow(
  tx: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  transferReversalId: string,
) {
  await tx.$queryRaw`SELECT id FROM "TransferReversal" WHERE id = ${transferReversalId} FOR UPDATE`
}
