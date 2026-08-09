import { Monitor, Moon, Sun } from 'lucide-react'

export type AuthTheme = 'light' | 'dark' | 'system'

export interface AuthThemeToggleProps {
  theme: AuthTheme
  onChange: (theme: AuthTheme) => void
  /** 'compact' drops the system option for tight mobile headers. */
  variant?: 'full' | 'compact'
}

/** Mirrors the app header toggle so auth screens keep the same theme control. */
export default function AuthThemeToggle({ theme, onChange, variant = 'full' }: AuthThemeToggleProps) {
  const options: Array<{ value: AuthTheme; icon: typeof Sun; label: string }> =
    variant === 'compact'
      ? [
          { value: 'light', icon: Sun, label: 'Light theme' },
          { value: 'dark', icon: Moon, label: 'Dark theme' },
        ]
      : [
          { value: 'light', icon: Sun, label: 'Light theme' },
          { value: 'system', icon: Monitor, label: 'Match system theme' },
          { value: 'dark', icon: Moon, label: 'Dark theme' },
        ]

  return (
    <div
      className="inline-flex items-center rounded-xl p-0.5 gap-0.5"
      role="group"
      aria-label="Colour theme"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
    >
      {options.map(option => {
        const Icon = option.icon
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 34,
              height: 34,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}
