export type TransactionalEmail = {
  toEmail: string
  subject: string
  html: string
  text: string
}

export type EmailSendResult = {
  ok: true
  providerMessageId?: string
} | {
  ok: false
  correlationId: string
  sanitizedError: string
}

export interface EmailProvider {
  sendTransactionalEmail(message: TransactionalEmail): Promise<EmailSendResult>
}
