import type { ReactNode } from 'react'

type Props = {
  businessName: string
  verificationStatus?: string
  children?: ReactNode
}

function statusPill(status?: string) {
  if (status === 'verified') return { label: 'Verified', className: 'prov-ui__pill--ok' }
  if (status === 'pending') return { label: 'Verification pending', className: 'prov-ui__pill--warn' }
  if (status === 'suspended') return { label: 'Suspended', className: 'prov-ui__pill--bad' }
  return { label: 'Unverified', className: 'prov-ui__pill--warn' }
}

export function ProviderDashboardHeader({ businessName, verificationStatus, children }: Props) {
  const pill = statusPill(verificationStatus)

  return (
    <header className="prov-ui__header">
      <div>
        <h1 className="prov-ui__title">{businessName}</h1>
        <span className={`prov-ui__pill ${pill.className}`}>{pill.label}</span>
      </div>
      {children}
    </header>
  )
}
