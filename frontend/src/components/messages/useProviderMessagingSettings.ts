import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'

export type ProviderMessagingSettings = {
  auto_welcome_enabled: boolean
  auto_welcome_body: string
  booking_confirmed_enabled: boolean
  booking_confirmed_body: string
  quick_replies_enabled: boolean
  quick_replies: string[]
  updated_at?: string
  business_id?: number | null
  business_name?: string | null
  owner_username?: string
  managed_for_owner?: boolean
  inherits_account_default?: boolean
  scope?: 'account' | 'business'
}

type Options = {
  enabled?: boolean
  businessId?: number | null
  canManageSettings?: boolean
}

export function providerMessagingSettingsPath(businessId?: number | null) {
  if (businessId != null) {
    return `/api/messaging/provider-settings/?business_id=${businessId}`
  }
  return '/api/messaging/provider-settings/'
}

export function useProviderMessagingSettings(options: Options = {}) {
  const { profile } = useAuth()
  const enabled = options.enabled ?? true
  const businessId = options.businessId
  const isProvider = profile?.user_type === 'service_provider'
  const canManage = options.canManageSettings ?? isProvider

  return useQuery({
    queryKey: ['provider-messaging-settings', businessId ?? 'self'],
    enabled: enabled && Boolean(canManage),
    queryFn: () => apiFetch<ProviderMessagingSettings>(providerMessagingSettingsPath(businessId)),
    staleTime: 60_000,
  })
}
