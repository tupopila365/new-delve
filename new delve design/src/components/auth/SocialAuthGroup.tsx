import SocialAuthButton from './SocialAuthButton'
import { enabledSocialProviders } from '../../data/authConfig'
import type { AuthConfiguration, SocialProviderId } from '../../data/authConfig'

export interface SocialAuthGroupProps {
  /** Reads from the backend config so disabled providers never render. */
  config?: AuthConfiguration
  onSelect?: (provider: SocialProviderId) => void
  loadingProvider?: SocialProviderId | null
  disabled?: boolean
  layout?: 'stacked' | 'row'
  /** Overrides provider copy, e.g. "Sign up with Google". */
  labelPrefix?: string
}

export default function SocialAuthGroup({
  config,
  onSelect,
  loadingProvider = null,
  disabled = false,
  layout = 'stacked',
  labelPrefix,
}: SocialAuthGroupProps) {
  const providers = config ? enabledSocialProviders(config) : enabledSocialProviders()
  if (providers.length === 0) return null

  return (
    <div className={layout === 'row' ? 'flex gap-2.5' : 'flex flex-col gap-2.5'}>
      {providers.map(provider => {
        const label = labelPrefix
          ? `${labelPrefix} ${provider.id === 'google' ? 'Google' : provider.id === 'apple' ? 'Apple' : 'phone number'}`
          : provider.label
        return (
          <SocialAuthButton
            key={provider.id}
            provider={provider.id}
            label={label}
            variant={layout === 'row' ? 'compact' : 'full'}
            loading={loadingProvider === provider.id}
            disabled={disabled || (loadingProvider !== null && loadingProvider !== provider.id)}
            onClick={() => onSelect?.(provider.id)}
          />
        )
      })}
    </div>
  )
}
