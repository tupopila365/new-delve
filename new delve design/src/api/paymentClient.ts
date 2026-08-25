import type {
  CreatePaymentDto,
  PaymentDto,
  ProviderEarningsDto,
  StripeConnectOnboardDto,
  StripeConnectStatusDto,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

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

export async function startConnectOnboarding(businessId: string) {
  return authorizedJson<StripeConnectOnboardDto>(
    `/businesses/${encodeURIComponent(businessId)}/payments/connect/onboard`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}
