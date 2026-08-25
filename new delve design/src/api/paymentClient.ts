import type {
  CreatePaymentDto,
  PaymentDto,
  ProviderDisputeSummary,
  ProviderEarningsDto,
  ProviderFinancialReportDto,
  StripeConnectOnboardDto,
  StripeConnectStatusDto,
} from '@delve/contracts'
import { authorizedFetch, authorizedJson, AuthApiError } from './authClient'

export async function startBookingPayment(bookingId: string) {
  return authorizedJson<CreatePaymentDto>(`/bookings/${encodeURIComponent(bookingId)}/payments`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function fetchBookingPayment(bookingId: string, paymentId: string) {
  return authorizedJson<PaymentDto>(
    `/bookings/${encodeURIComponent(bookingId)}/payments/${encodeURIComponent(paymentId)}`,
  )
}

export async function fetchConnectStatus(businessId: string) {
  return authorizedJson<StripeConnectStatusDto>(
    `/businesses/${encodeURIComponent(businessId)}/payments/connect/status`,
  )
}

export async function fetchProviderEarnings(businessId: string) {
  return authorizedJson<ProviderEarningsDto>(
    `/businesses/${encodeURIComponent(businessId)}/payments/earnings`,
  )
}

export async function fetchProviderFinancialReport(
  businessId: string,
  query: { preset: string; from?: string; to?: string },
) {
  const params = new URLSearchParams({ preset: query.preset })
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  return authorizedJson<ProviderFinancialReportDto>(
    `/businesses/${encodeURIComponent(businessId)}/payments/reports?${params.toString()}`,
  )
}

export async function downloadProviderEarningsCsv(
  businessId: string,
  query: { preset: string; from?: string; to?: string },
) {
  const params = new URLSearchParams({ preset: query.preset })
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  const res = await authorizedFetch(
    `/businesses/${encodeURIComponent(businessId)}/payments/reports/export.csv?${params.toString()}`,
  )
  if (!res.ok) {
    throw new AuthApiError('Could not export earnings', { status: res.status })
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'delve-earnings.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export async function fetchBusinessDisputes(businessId: string) {
  return authorizedJson<ProviderDisputeSummary[]>(
    `/businesses/${encodeURIComponent(businessId)}/disputes`,
  )
}

export async function submitProviderDisputeNote(businessId: string, disputeId: string, note: string) {
  return authorizedJson<ProviderDisputeSummary>(
    `/businesses/${encodeURIComponent(businessId)}/disputes/${encodeURIComponent(disputeId)}/evidence`,
    { method: 'POST', body: JSON.stringify({ note }) },
  )
}

export async function startConnectOnboarding(businessId: string) {
  return authorizedJson<StripeConnectOnboardDto>(
    `/businesses/${encodeURIComponent(businessId)}/payments/connect/onboard`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}
