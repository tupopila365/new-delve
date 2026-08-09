import { useState } from 'react'
import { Compass, Maximize2, Monitor, RotateCcw, Smartphone } from 'lucide-react'
import { DeviceFrame, Note, SectionIntro, SpecTable } from './BoardKit'
import AuthFlow from '../AuthFlow'
import type { AuthRoute } from '../AuthFlow'
import { AuthThemeToggle, PrimaryButton, SecondaryButton } from '../../../components/auth'
import type { AuthTheme } from '../../../components/auth/AuthThemeToggle'

type PrototypeViewport = 'fluid' | 'desktop' | 'mobile'

const viewportOptions: Array<{ value: PrototypeViewport; label: string; icon: typeof Monitor }> = [
  { value: 'fluid', label: 'Fit to board', icon: Maximize2 },
  { value: 'desktop', label: '1440', icon: Monitor },
  { value: 'mobile', label: '390', icon: Smartphone },
]

const startingPoints: Array<{ route: AuthRoute; label: string }> = [
  { route: 'signIn', label: 'Sign in' },
  { route: 'signUp', label: 'Sign up' },
  { route: 'forgotPassword', label: 'Forgot password' },
  { route: 'emailVerification', label: 'Email verification' },
  { route: 'phoneVerification', label: 'Phone verification' },
  { route: 'sessionExpired', label: 'Session expired' },
  { route: 'socialConflict', label: 'Social conflict' },
  { route: 'accountRestricted', label: 'Account restricted' },
]

export interface PrototypeSectionProps {
  /** Lets the host app mark itself signed in when the walkthrough completes. */
  onAuthenticated?: () => void
}

export default function PrototypeSection({ onAuthenticated }: PrototypeSectionProps) {
  const [viewport, setViewport] = useState<PrototypeViewport>('fluid')
  const [route, setRoute] = useState<AuthRoute>('signUp')
  const [frameTheme, setFrameTheme] = useState<AuthTheme>('system')
  const [runId, setRunId] = useState(0)
  const [returned, setReturned] = useState(false)

  function restart(next: AuthRoute) {
    setRoute(next)
    setReturned(false)
    setRunId(id => id + 1)
  }

  const returnedToApp = (
    <div
      className="h-full w-full flex flex-col items-center justify-center text-center px-8"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <span
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{ width: 60, height: 60, background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
      >
        <Compass size={28} />
      </span>
      <p className="font-display font-bold" style={{ fontSize: 24, margin: 0 }}>
        Back in the Delve app
      </p>
      <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)', maxWidth: 380, lineHeight: 1.6 }}>
        This stands in for the destination the traveler came from. In the running app the same callback returns them
        to Home, or to the deal, stay or community they were trying to reach.
      </p>
      <div className="flex flex-col gap-2.5 mt-6" style={{ width: 260 }}>
        <PrimaryButton onClick={() => restart('signIn')}>Sign out and sign in again</PrimaryButton>
        <SecondaryButton onClick={() => restart('signUp')}>Restart the walkthrough</SecondaryButton>
      </div>
    </div>
  )

  const flow = returned ? (
    returnedToApp
  ) : (
    <AuthFlow
      key={`${runId}-${route}`}
      initialRoute={route}
      layout={viewport === 'mobile' ? 'stacked' : viewport === 'desktop' ? 'split' : 'auto'}
      destinationLabel="your saved stays"
      headerTrailing={<AuthThemeToggle theme={frameTheme} onChange={setFrameTheme} variant="compact" />}
      onAuthenticated={() => {
        setReturned(true)
        onAuthenticated?.()
      }}
      onExit={() => setReturned(true)}
    />
  )

  const resolvedTheme: 'light' | 'dark' | undefined =
    frameTheme === 'system' ? undefined : frameTheme

  return (
    <section aria-labelledby="prototype">
      <div id="prototype">
        <SectionIntro
          index="08"
          title="Authentication Prototype"
          description="A live walkthrough, not a click-through of images. Create an account, verify a code, land on the ready screen, come back to sign in, recover a password and return to the app — all with real validation, real timers and real state."
          meta="Figma · 08 Authentication / Prototype"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="inline-flex items-center rounded-xl p-1 gap-1"
          role="group"
          aria-label="Prototype viewport"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
        >
          {viewportOptions.map(option => {
            const Icon = option.icon
            const active = viewport === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setViewport(option.value)}
                aria-pressed={active}
                className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3"
                style={{
                  minHeight: 36,
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--fg)' : 'var(--fg-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <Icon size={14} />
                {option.label}
              </button>
            )
          })}
        </div>

        <AuthThemeToggle theme={frameTheme} onChange={setFrameTheme} />

        <button
          type="button"
          onClick={() => restart(route)}
          className="inline-flex items-center gap-1.5 text-sm font-medium rounded-xl px-3"
          style={{
            minHeight: 38,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {startingPoints.map(point => {
          const active = route === point.route && !returned
          return (
            <button
              key={point.route}
              type="button"
              onClick={() => restart(point.route)}
              aria-pressed={active}
              className="text-sm font-medium rounded-lg px-3"
              style={{
                minHeight: 38,
                background: active ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                color: active ? 'var(--primary)' : 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              {point.label}
            </button>
          )
        })}
      </div>

      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: 16 }}
      >
        {viewport === 'fluid' ? (
          <div
            data-theme={resolvedTheme}
            style={{
              height: 760,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--fg)',
            }}
          >
            {flow}
          </div>
        ) : viewport === 'desktop' ? (
          <DeviceFrame width={1440} height={900} theme={resolvedTheme} label="Interactive · desktop">
            {flow}
          </DeviceFrame>
        ) : (
          <div style={{ maxWidth: 390, margin: '0 auto' }}>
            <DeviceFrame
              width={390}
              height={844}
              device="mobile"
              theme={resolvedTheme}
              label="Interactive · mobile"
              maxScale={1}
            >
              {flow}
            </DeviceFrame>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Note title="The intended walkthrough">
          Start on <strong>Sign up</strong>. Fill in the form — the password meter and requirement list react as you
          type, but errors only appear on blur or submit. Submit, then enter any six digits to verify. From the ready
          screen choose <strong>Start exploring</strong> to return to the app, then <strong>Sign out and sign in
          again</strong>, use <strong>Forgot password?</strong>, request a code, set a new password and sign in.
        </Note>

        <SpecTable
          caption="Demo triggers — these exist only so every documented state is reachable. The real backend decides all of this."
          columns={['Enter this', 'Where', 'What it demonstrates']}
          rows={[
            ['Any valid email plus a 10+ character password', 'Sign in', 'Successful sign-in and return to the app'],
            ['A password shorter than 10 characters', 'Sign in', 'Generic invalid credentials — never says which field was wrong'],
            ['locked@example.com', 'Sign in', 'Restricted account, then the full restricted screen'],
            ['unverified@example.com', 'Sign in', 'Unverified email with a resend action'],
            ['busy@example.com', 'Sign in', 'Rate limited after too many attempts'],
            ['offline@example.com', 'Sign in', 'Offline state'],
            ['down@example.com', 'Sign in', 'Server unavailable'],
            ['Continue with Apple', 'Sign in', 'A social provider round-trip that fails'],
            ['000000', 'Any code entry', 'Wrong code, attempts counting down to a lockout'],
            ['111111', 'Any code entry', 'Expired code'],
            ['222222', 'Recovery code entry', 'Code already used'],
            ['Any other six digits', 'Any code entry', 'Successful verification'],
          ]}
        />

        <Note title="What is not simulated" tone="neutral">
          No network calls are made and no endpoints are assumed. Timers stand in for request latency so the loading,
          cooldown and lockout states are visible; swapping them for the real client is the only change these screens
          need.
        </Note>
      </div>
    </section>
  )
}
