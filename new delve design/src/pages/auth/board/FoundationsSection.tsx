import {
  ArrowRight,
  Eye,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react'
import { BoardGrid, Chip, Note, PreviewCard, SectionIntro, SpecTable, Swatch } from './BoardKit'
import { DelveLogo, PrimaryButton, SecondaryButton, TextField, TravelImagePanel } from '../../../components/auth'
import { authConfig, passwordRequirements } from '../../../data/authConfig'

const iconSet = [
  { icon: Mail, name: 'Mail' },
  { icon: Lock, name: 'Lock' },
  { icon: Eye, name: 'Eye' },
  { icon: Phone, name: 'Phone' },
  { icon: Smartphone, name: 'Smartphone' },
  { icon: UserRound, name: 'UserRound' },
  { icon: ShieldCheck, name: 'ShieldCheck' },
  { icon: ArrowRight, name: 'ArrowRight' },
]

export default function FoundationsSection() {
  return (
    <section aria-labelledby="foundations-heading">
      <div id="foundations-heading">
        <SectionIntro
          index="01"
          title="Authentication Foundations"
          description="The tokens, type and rules every auth surface is built from. Colour comes from the shared Delve theme variables, so a screen placed in the app inherits light and dark automatically."
          meta="Figma · 08 Authentication / Foundations"
        />
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Brand and canvas
          </h3>
          <BoardGrid min={180} gap={14}>
            <Swatch name="Delve Purple" value="#8C52FF" usage="Dark-theme primary, brand marks, focus ring" />
            <Swatch name="Purple Deep" value="#5F2FC9" usage="Light-theme primary — 5.9:1 on white" />
            <Swatch name="Purple Soft" value="#C7ACFF" usage="Overlays, dark-theme focus, decorative" onColor="#1A1814" />
            <Swatch name="Travel Canvas" value="#F4F1EA" usage="Light page background" onColor="#1A1814" />
            <Swatch name="Surface" value="#FFFFFF" usage="Cards, fields, buttons" onColor="#1A1814" />
            <Swatch name="Near Black" value="#0C0A09" usage="Dark page background" />
            <Swatch name="Dark Surface" value="#1B1816" usage="Dark cards and fields" />
            <Swatch name="Ink" value="#1A1814" usage="Primary text on light" />
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Feedback tokens
          </h3>
          <BoardGrid min={180} gap={14}>
            <Swatch name="Success" value="#0F8A52" usage="Verified, password match" />
            <Swatch name="Warning" value="#B45309" usage="Rate limits, unverified, expiry" />
            <Swatch name="Danger" value="#C42A2A" usage="Field and form errors" />
            <Swatch name="Focus halo" value="rgba(140,82,255,0.22)" usage="3px ring behind focused fields" onColor="#1A1814" />
          </BoardGrid>
          <div className="mt-3">
            <Note title="Dark theme swaps these, not the meaning" tone="neutral">
              Dark mode lifts each feedback colour (success <code>#4ADE9B</code>, warning <code>#FBBF4D</code>, danger{' '}
              <code>#FF8B84</code>) so contrast stays at or above 4.5:1 on <code>#0C0A09</code>. Components only ever
              reference the token, never the hex.
            </Note>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Typography
          </h3>
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="font-display font-bold" style={{ fontSize: 30, letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back
            </p>
            <p className="text-xs mt-1 mb-5" style={{ color: 'var(--fg-muted)' }}>
              Syne Bold 30/34, −2% tracking · screen titles
            </p>

            <p className="font-display font-bold" style={{ fontSize: 22, margin: 0 }}>
              Verify it is you
            </p>
            <p className="text-xs mt-1 mb-5" style={{ color: 'var(--fg-muted)' }}>
              Syne Bold 22/26 · modal and compact titles
            </p>

            <p className="text-sm" style={{ margin: 0 }}>
              Sign in to pick up your journeys, saved places and bookings.
            </p>
            <p className="text-xs mt-1 mb-5" style={{ color: 'var(--fg-muted)' }}>
              DM Sans Regular 14/22 · body and supporting copy
            </p>

            <p className="text-sm font-semibold" style={{ margin: 0 }}>
              Email address
            </p>
            <p className="text-xs mt-1 mb-5" style={{ color: 'var(--fg-muted)' }}>
              DM Sans SemiBold 14 · field labels, always above the input
            </p>

            <p className="text-xs" style={{ color: 'var(--fg-muted)', margin: 0 }}>
              We send your verification code here.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              DM Sans Regular 12/19 · hints, errors, legal
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Layout and interaction rules
          </h3>
          <SpecTable
            columns={['Rule', 'Value', 'Why']}
            rows={[
              ['Form column', '420–480px, 460px default', 'Comfortable single-column reading on any desktop width'],
              ['Split panel', '46% travel image / 54% form', 'Image stays cinematic without squeezing the form'],
              ['Field height', '48px, 52px primary button', 'Above the 44px minimum touch target on every control'],
              ['Corner radius', '12px controls, 20px cards and dialogs', 'Matches the app’s rounded card language'],
              ['Vertical rhythm', '18px between fields, 24px under the title block', 'Calm spacing, no cramped stacks'],
              ['Focus', '2px outline + 3px halo, focus-visible only', 'Keyboard users always see where they are'],
              ['Validation', 'On blur and on submit, never mid-typing', 'Avoids scolding people as they type'],
              ['Loading', 'Button shows spinner and blocks resubmission', 'One submit means one request'],
              ['Motion', 'Under 250ms, disabled under prefers-reduced-motion', 'Respects vestibular sensitivity'],
            ]}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Anatomy
          </h3>
          <BoardGrid min={320}>
            <PreviewCard title="Logo" caption="Compass mark plus Syne wordmark. On imagery the mark switches to a translucent chip.">
              <div className="flex items-center gap-6 flex-wrap">
                <DelveLogo size="lg" />
                <DelveLogo size="md" />
                <DelveLogo size="sm" showMark={false} />
              </div>
            </PreviewCard>

            <PreviewCard title="Field and buttons" caption="Label above, icon inside, hint below — the pattern every field follows.">
              <div className="flex flex-col gap-3">
                <TextField label="Email address" value="" placeholder="you@example.com" iconLeft={<Mail size={17} />} hint="We never share this." onChange={() => {}} />
                <PrimaryButton>Sign in</PrimaryButton>
                <SecondaryButton>Back to sign in</SecondaryButton>
              </div>
            </PreviewCard>

            <PreviewCard title="Travel panel" caption="Generated imagery with a purple wash — never stock photography with text baked in.">
              <div style={{ height: 260, borderRadius: 16, overflow: 'hidden' }}>
                <TravelImagePanel rounded headline="Every good trip starts with a first step." supporting="" />
              </div>
            </PreviewCard>

            <PreviewCard title="Iconography" caption="Lucide only, 17px inside fields, 22–24px in title blocks, 2px stroke.">
              <div className="flex flex-wrap gap-3">
                {iconSet.map(({ icon: Icon, name }) => (
                  <span
                    key={name}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl"
                    style={{ width: 68, height: 62, background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
                  >
                    <Icon size={18} style={{ color: 'var(--fg)' }} />
                    <span className="text-xs" style={{ color: 'var(--fg-muted)', fontSize: 10 }}>
                      {name}
                    </span>
                  </span>
                ))}
              </div>
            </PreviewCard>
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Security and privacy principles
          </h3>
          <BoardGrid min={280}>
            <Note title="Recovery never confirms an account">
              Every password reset request returns the same neutral message, whether or not the address is registered.
            </Note>
            <Note title="Contact details are always masked" tone="neutral">
              Screens show <code>tr•••••@e•••••.com</code> and <code>+264 •••••••67</code> — never the full value.
            </Note>
            <Note title="No secrets in the interface" tone="warning">
              Passwords, tokens and one-time codes never appear in documentation, placeholders or examples.
            </Note>
            <Note title="Marketing consent is opt-in" tone="neutral">
              The marketing checkbox starts unchecked and is never required to create an account.
            </Note>
            <Note title="Providers follow config" tone="neutral">
              A social button only renders when the backend reports that provider as enabled.
            </Note>
            <Note title="Generic failures" tone="danger">
              Unexpected errors say something went wrong and offer a retry — they never expose internal detail.
            </Note>
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Live policy values
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <Chip tone="brand">Minimum {authConfig.passwordRules.minimumLength} characters</Chip>
            <Chip tone="brand">{passwordRequirements.length} password rules</Chip>
            <Chip tone="brand">{authConfig.verification.otpLength}-digit codes</Chip>
            <Chip tone="brand">{authConfig.verification.resendCooldownSeconds}s resend cooldown</Chip>
            <Chip tone="brand">{authConfig.verification.maximumAttempts} attempts</Chip>
            <Chip tone="brand">{authConfig.lockoutMinutes} minute lockout</Chip>
            <Chip tone="brand">{authConfig.sessionIdleTimeoutMinutes} minute idle timeout</Chip>
          </div>
          <Note title="These numbers are read, not written" tone="neutral">
            Every value above comes from <code>src/data/authConfig.ts</code>, standing in for the backend
            configuration. Change it there and the screens, hints and validation follow.
          </Note>
        </div>
      </div>
    </section>
  )
}
