import DelveLogo from './DelveLogo'
import LoadingSpinner from './LoadingSpinner'

export interface FullPageLoaderProps {
  message?: string
  /** 'overlay' floats above the current screen, 'page' fills the frame. */
  variant?: 'page' | 'overlay'
  showLogo?: boolean
}

export default function FullPageLoader({
  message = 'Getting things ready…',
  variant = 'page',
  showLogo = true,
}: FullPageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 ${
        variant === 'overlay' ? 'absolute inset-0 z-40' : 'w-full h-full'
      }`}
      style={{
        minHeight: variant === 'page' ? 320 : undefined,
        background:
          variant === 'overlay' ? 'color-mix(in srgb, var(--bg) 82%, transparent)' : 'var(--bg)',
        backdropFilter: variant === 'overlay' ? 'blur(3px)' : undefined,
      }}
    >
      {showLogo && <DelveLogo size="md" />}
      <LoadingSpinner size={26} color="var(--primary)" thickness={3} />
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {message}
      </p>
    </div>
  )
}
