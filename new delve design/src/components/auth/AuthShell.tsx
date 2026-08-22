import type { ReactNode } from 'react'
import TravelImagePanel from './TravelImagePanel'
import type { TravelImageKey } from './TravelImagePanel'

export type AuthShellLayout = 'auto' | 'split' | 'stacked'

/** One logo per auth page: hero panel on desktop, header on mobile (auto layout). */
export function authHeaderLogoPlacement(layout: AuthShellLayout): 'always' | 'mobile-only' | 'never' {
  if (layout === 'stacked') return 'always'
  if (layout === 'split') return 'never'
  return 'mobile-only'
}

export interface AuthShellProps {
  children: ReactNode
  /** 'auto' follows viewport breakpoints; the fixed values let the design board
   * render 1440 / 1024 / 390 frames inside a scaled container. */
  layout?: AuthShellLayout
  image?: TravelImageKey
  imageSide?: 'left' | 'right'
  showImagePanel?: boolean
  /** When false, the travel panel shows only the mark (no DELVE wordmark). */
  logoShowWordmark?: boolean
  panelHeadline?: string
  panelSupporting?: string
  /** Rendered above the form column, typically an AuthHeader. */
  header?: ReactNode
  footer?: ReactNode
  formWidth?: number
  /** Mobile-only decorative purple band behind the header. */
  decorativeHeader?: boolean
  fullHeight?: boolean
  scroll?: boolean
}

export default function AuthShell({
  children,
  layout = 'auto',
  image = 'dunes',
  imageSide = 'left',
  showImagePanel = true,
  logoShowWordmark = true,
  panelHeadline,
  panelSupporting,
  header,
  footer,
  formWidth = 460,
  decorativeHeader = false,
  fullHeight = true,
  scroll = true,
}: AuthShellProps) {
  const panelClass =
    !showImagePanel || layout === 'stacked' ? 'hidden' : layout === 'split' ? 'block' : 'hidden lg:block'

  const panel = (
    <div className={`${panelClass} relative flex-shrink-0`} style={{ width: layout === 'split' ? '46%' : '46%' }}>
      <TravelImagePanel
        image={image}
        headline={panelHeadline}
        supporting={panelSupporting}
        showWordmark={logoShowWordmark}
      />
    </div>
  )

  return (
    <div
      className="flex w-full"
      style={{
        minHeight: fullHeight ? '100%' : undefined,
        height: fullHeight ? '100%' : undefined,
        background: 'var(--bg)',
        color: 'var(--fg)',
      }}
    >
      {imageSide === 'left' && panel}

      <div
        className="flex-1 min-w-0 flex flex-col relative"
        style={{ overflowY: scroll ? 'auto' : 'visible' }}
      >
        {decorativeHeader && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0"
            style={{
              height: 148,
              background:
                'radial-gradient(120% 100% at 50% 0%, rgba(140,82,255,0.22), rgba(140,82,255,0) 70%)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div className="relative flex-1 flex flex-col items-center px-5 sm:px-8 py-6 sm:py-8">
          <div className="w-full" style={{ maxWidth: formWidth }}>
            {header}
          </div>
          <div className="w-full flex-1 flex flex-col justify-center" style={{ maxWidth: formWidth }}>
            <div className="py-6 sm:py-8">{children}</div>
          </div>
          {footer && (
            <div className="w-full" style={{ maxWidth: formWidth }}>
              {footer}
            </div>
          )}
        </div>
      </div>

      {imageSide === 'right' && panel}
    </div>
  )
}
