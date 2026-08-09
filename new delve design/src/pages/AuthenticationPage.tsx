import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import AuthThemeToggle from '../components/auth/AuthThemeToggle'
import type { AuthTheme } from '../components/auth/AuthThemeToggle'
import DelveLogo from '../components/auth/DelveLogo'
import FoundationsSection from './auth/board/FoundationsSection'
import ScreensSection from './auth/board/ScreensSection'
import ThemeSection from './auth/board/ThemeSection'
import FormStatesSection from './auth/board/FormStatesSection'
import PrototypeSection from './auth/board/PrototypeSection'
import BackendHandoffSection from './auth/board/BackendHandoffSection'
import ComponentInventorySection from './auth/board/ComponentInventorySection'

export type AuthBoardSection =
  | 'foundations'
  | 'desktop'
  | 'tablet'
  | 'mobile'
  | 'light'
  | 'dark'
  | 'formStates'
  | 'prototype'
  | 'handoff'
  | 'components'

interface SectionEntry {
  id: AuthBoardSection
  index: string
  label: string
  hint: string
}

const sections: SectionEntry[] = [
  { id: 'foundations', index: '01', label: 'Foundations', hint: 'Tokens, type, rules' },
  { id: 'desktop', index: '02', label: 'Desktop · 1440', hint: '15 screens' },
  { id: 'tablet', index: '03', label: 'Tablet · 1024', hint: '8 screens' },
  { id: 'mobile', index: '04', label: 'Mobile · 390', hint: '13 screens' },
  { id: 'light', index: '05', label: 'Light theme', hint: 'Contrast checks' },
  { id: 'dark', index: '06', label: 'Dark theme', hint: 'Contrast checks' },
  { id: 'formStates', index: '07', label: 'Form states', hint: 'Fields, buttons, alerts' },
  { id: 'prototype', index: '08', label: 'Prototype', hint: 'Interactive walkthrough' },
  { id: 'handoff', index: '09', label: 'Backend handoff', hint: 'Data contract' },
  { id: 'components', index: '02·C', label: 'Component inventory', hint: 'For 02 Components' },
]

export interface AuthenticationPageProps {
  onBackToApp?: () => void
  /** App theme state, so the board and the app share one control. */
  theme?: AuthTheme
  onThemeChange?: (theme: AuthTheme) => void
  /** Custom header slot; used when the host app supplies its own toggle. */
  headerTrailing?: ReactNode
  initialSection?: AuthBoardSection
  /** Opens the app's real sign-in flow rather than the embedded prototype. */
  onOpenLiveFlow?: () => void
  /** Fires when the embedded prototype completes a sign-in. */
  onAuthenticated?: () => void
}

export default function AuthenticationPage({
  onBackToApp,
  theme,
  onThemeChange,
  headerTrailing,
  initialSection = 'foundations',
  onOpenLiveFlow,
  onAuthenticated,
}: AuthenticationPageProps) {
  const [active, setActive] = useState<AuthBoardSection>(initialSection)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [active])

  function renderSection() {
    switch (active) {
      case 'desktop':
        return <ScreensSection viewport="desktop" />
      case 'tablet':
        return <ScreensSection viewport="tablet" />
      case 'mobile':
        return <ScreensSection viewport="mobile" />
      case 'light':
        return <ThemeSection theme="light" />
      case 'dark':
        return <ThemeSection theme="dark" />
      case 'formStates':
        return <FormStatesSection />
      case 'prototype':
        return <PrototypeSection onAuthenticated={onAuthenticated} />
      case 'handoff':
        return <BackendHandoffSection />
      case 'components':
        return <ComponentInventorySection />
      default:
        return <FoundationsSection />
    }
  }

  const current = sections.find(section => section.id === active) ?? sections[0]

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <header
        className="sticky top-0 z-50"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg"
              style={{
                minHeight: 44,
                padding: '0 10px 0 6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={17} />
              <span className="hidden sm:inline">Back to app</span>
            </button>
          )}
          <DelveLogo size="sm" showMark={false} />
          <span className="text-sm hidden md:inline" style={{ color: 'var(--fg-muted)' }}>
            08 Authentication
          </span>
          <div className="ml-auto flex items-center gap-2">
            {onOpenLiveFlow && (
              <button
                type="button"
                onClick={onOpenLiveFlow}
                className="text-sm font-semibold rounded-xl px-3"
                style={{ minHeight: 38, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Open sign in
              </button>
            )}
            {headerTrailing}
            {!headerTrailing && theme && onThemeChange && (
              <AuthThemeToggle theme={theme} onChange={onThemeChange} />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 flex gap-8">
        <aside className="hidden lg:block flex-shrink-0" style={{ width: 236 }}>
          <nav className="sticky top-20 flex flex-col gap-1" aria-label="Design board sections">
            <p
              className="text-xs font-semibold uppercase tracking-widest px-3 pb-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              Page sections
            </p>
            {sections.map(section => {
              const isActive = section.id === active
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="text-left rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    background: isActive ? 'rgba(140,82,255,0.1)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  <span
                    className="text-sm font-medium block"
                    style={{ color: isActive ? 'var(--primary)' : 'var(--fg)', fontWeight: isActive ? 600 : 500 }}
                  >
                    <span className="tabular-nums mr-2" style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
                      {section.index}
                    </span>
                    {section.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {section.hint}
                  </span>
                </button>
              )
            })}
            <p className="text-xs px-3 pt-4" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
              One section renders at a time so the board stays responsive with live screens mounted.
            </p>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="lg:hidden -mx-4 px-4 mb-5">
            <div className="scroll-rail" role="tablist" aria-label="Design board sections">
              {sections.map(section => {
                const isActive = section.id === active
                return (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActive(section.id)}
                    className="text-sm font-medium rounded-xl px-3 whitespace-nowrap"
                    style={{
                      minHeight: 44,
                      background: isActive ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                      border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                      color: isActive ? 'var(--primary)' : 'var(--fg-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="tabular-nums mr-1.5" style={{ fontSize: 11 }}>
                      {section.index}
                    </span>
                    {section.label}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-xs mb-4 lg:hidden" style={{ color: 'var(--fg-muted)' }}>
            Viewing {current.index} · {current.label}
          </p>

          {renderSection()}

          <footer className="mt-12 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-muted)', lineHeight: 1.7 }}>
              Delve Traveler · 08 Authentication. Screens, states and the prototype all render the same components
              from <code>src/components/auth</code>. Rules and copy come from{' '}
              <code>src/data/authConfig.ts</code>, which stands in for backend-owned configuration.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
