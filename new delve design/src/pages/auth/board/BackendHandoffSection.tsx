import { Note, SectionIntro, SpecTable } from './BoardKit'
import {
  authConfig,
  authStateCatalog,
  passwordRequirements,
  recoveryStateCatalog,
  sampleMaskedEmail,
  sampleMaskedPhone,
} from '../../../data/authConfig'

/** Figma annotation layer: `Authentication Data & Backend Contract`. */
export default function BackendHandoffSection() {
  return (
    <section aria-labelledby="backend-handoff">
      <div id="backend-handoff">
        <SectionIntro
          index="09"
          title="Backend Handoff"
          description="What the interface expects, what it must never assume, and where the authority sits. The backend owns every rule below — the UI reads them and renders accordingly."
          meta="Figma · 08 Authentication / Authentication Data & Backend Contract"
        />
      </div>

      <div className="flex flex-col gap-7">
        <Note title="No endpoints are specified here" tone="warning">
          These screens deliberately do not name routes, methods or payload shapes. They describe the data the
          interface consumes and the states it can present. The API contract stays with the backend team; wiring is a
          matter of replacing the mocked timers in the screens with the real client.
        </Note>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            User
          </h3>
          <SpecTable
            caption="Fields the auth surfaces read or write. Types shown as TypeScript for reference only."
            columns={['Field', 'Type', 'Used by the interface for']}
            rows={[
              ['id', 'string', 'Session identity. Never rendered.'],
              ['username / usernameNormalized', 'string', 'Unique public handle; login accepts email or username'],
              ['email', 'string', 'Sign-in identifier — never echoed back in full after submit'],
              ['maskedEmail', 'string', 'Backend-provided masked address for recovery and verification copy'],
              ['emailVerified', 'boolean', 'Gates the unverified-email state on sign-in'],
              ['accountStatus', "'active' | 'pendingVerification' | 'restricted' | 'disabled'", 'Selects restricted or disabled messaging'],
              ['authenticationMethods', "Array<'password'>", 'Password only for Day 2 — no Google/Apple'],
              ['profileCompletionStatus', "'incomplete' | 'basic' | 'complete'", 'Post-auth prompt to set up profile; never blocks sign-up'],
              ['preferredTheme', "'light' | 'dark' | 'system'", 'Restored after sign-in when the traveler has a preference'],
              ['marketingOptIn', 'boolean', 'Optional consent, never defaulted to true'],
              ['termsAcceptedAt / privacyAcknowledgedAt', 'string | null', 'Written once at sign-up from the required consent'],
              ['createdAt / lastSignInAt', 'string | null', 'Not shown in auth; listed so the shape is complete'],
              ['avatarUrl / homeCity', 'string | null', 'Populated later in profile setup, never required to sign up'],
            ]}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Authentication configuration
          </h3>
          <SpecTable
            caption="Current mock values. The UI must treat these as backend-authoritative and re-read them, not cache assumptions."
            columns={['Key', 'Current value', 'Effect on the interface']}
            rows={[
              [
                'enabledSignInMethods',
                authConfig.enabledSignInMethods.join(', '),
                'Controls which identifier paths appear on sign-in and sign-up',
              ],
              [
                'passwordRules',
                `min ${authConfig.passwordRules.minimumLength}, max ${authConfig.passwordRules.maximumLength}, lower/upper/number required, symbol optional`,
                `Generates the ${passwordRequirements.length} live requirement rows and the strength meter`,
              ],
              [
                'passwordRules.requireConfirmation',
                String(authConfig.passwordRules.requireConfirmation),
                'Shows or hides the confirm-password field',
              ],
              [
                'passwordRules.blockCommonPasswords',
                String(authConfig.passwordRules.blockCommonPasswords),
                'Adds the "not a commonly used password" requirement. The real list stays server-side.',
              ],
              [
                'socialProviders',
                authConfig.socialProviders.length === 0
                  ? 'none (Day 2)'
                  : authConfig.socialProviders.map(p => `${p.id}: ${p.enabled ? 'on' : 'off'}`).join(', '),
                'Empty — Google and Apple are not offered on traveler auth.',
              ],
              [
                'verificationMethods',
                authConfig.verificationMethods.join(', '),
                'Channels offered during identity verification',
              ],
              [
                'otpLength / resendCooldownSeconds / maximumAttempts',
                `${authConfig.otpLength} / ${authConfig.resendCooldownSeconds}s / ${authConfig.maximumAttempts}`,
                'OTP box count, resend countdown, and locked-code threshold',
              ],
              [
                'verification.phoneVerificationSupported',
                String(authConfig.verification.phoneVerificationSupported),
                'Whether step 2 offers SMS as an alternative channel',
              ],
              [
                'verification.voiceCallFallbackEnabled',
                String(authConfig.verification.voiceCallFallbackEnabled),
                'Currently off, so "call me instead" never renders',
              ],
              [
                'maximumSignInAttempts / lockoutMinutes',
                `${authConfig.maximumSignInAttempts} / ${authConfig.lockoutMinutes}`,
                'Rate-limited copy after repeated failures',
              ],
              [
                'sessionIdleTimeoutMinutes',
                String(authConfig.sessionIdleTimeoutMinutes),
                'Session expired dialog and screen',
              ],
              [
                'rememberMeDurationDays',
                String(authConfig.rememberMeDurationDays),
                'Description under "Keep me signed in"',
              ],
              [
                'allowPhoneSignIn',
                String(authConfig.allowPhoneSignIn),
                'Switches the sign-in label to "Email or phone number"',
              ],
              [
                'termsVersion / privacyVersion',
                `${authConfig.termsVersion} / ${authConfig.privacyVersion}`,
                'Consent records store the version the traveler accepted',
              ],
              [
                'requireTermsAcceptance / requirePrivacyAcknowledgement',
                `${authConfig.requireTermsAcceptance} / ${authConfig.requirePrivacyAcknowledgement}`,
                'Makes the consent checkbox required and blocks submit without it',
              ],
              [
                'marketingConsentEnabled',
                String(authConfig.marketingConsentEnabled),
                'When false, the optional marketing checkbox is not rendered',
              ],
              [
                'marketingOptInDefault',
                String(authConfig.marketingOptInDefault),
                'Typed as literal false — the marketing checkbox can never ship pre-checked',
              ],
              [
                'countries / defaultCountryCode',
                `${authConfig.countries.length} entries, default ${authConfig.defaultCountryCode}`,
                'Dial code selector and per-country phone length validation',
              ],
              [
                'supportEmail / supportHoursLabel',
                `${authConfig.supportEmail} · ${authConfig.supportHoursLabel}`,
                'Support links on restricted, recovery and error screens',
              ],
            ]}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Response states
          </h3>
          <SpecTable
            caption="The interface renders one of these; it never invents a message from a raw error."
            columns={['State', 'Tone', 'Copy shown to the traveler']}
            rows={authStateCatalog.map(descriptor => [descriptor.label, descriptor.tone, descriptor.message])}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Recovery states
          </h3>
          <SpecTable
            columns={['State', 'Copy shown to the traveler']}
            rows={recoveryStateCatalog.map(descriptor => [descriptor.label, descriptor.message])}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Non-negotiable rules
          </h3>
          <SpecTable
            columns={['Rule', 'Applies to', 'Detail']}
            rows={[
              [
                'Never confirm account existence',
                'Recovery, sign-in',
                'A reset request always returns the same neutral confirmation. Invalid credentials never say which half was wrong.',
              ],
              [
                'Mask every contact detail',
                'Recovery, verification, conflict',
                `Rendered as ${sampleMaskedEmail} and ${sampleMaskedPhone}.`,
              ],
              [
                'No secrets in the interface',
                'Everywhere',
                'Passwords, tokens and codes never appear in placeholders, examples or documentation. Placeholders use dots.',
              ],
              [
                'Password policy is server-owned',
                'Sign-up, recovery',
                'The client mirrors the policy for feedback only. The backend re-validates every submission.',
              ],
              [
                'Rate limits are enforced server-side',
                'Sign-in, OTP, resend',
                'Client countdowns are a courtesy. The backend must reject attempts regardless of what the UI shows.',
              ],
              [
                'Consent is explicit and recorded',
                'Sign-up',
                'Terms and privacy acceptance is a required, unchecked control. Marketing is separate, optional and unchecked.',
              ],
              [
                'Providers follow configuration',
                'Sign-in, sign-up',
                'A disabled provider must not render, even behind a feature flag on the client.',
              ],
              [
                'Errors stay generic',
                'Everywhere',
                'Unexpected failures show a retry and a support link. No stack traces, codes or internal detail.',
              ],
              [
                'Reference IDs, not identifiers',
                'Restricted, disabled',
                'Support references are opaque and safe to share. They are not session tokens or user IDs.',
              ],
            ]}
          />
        </div>

        <Note title="Open questions for the backend team" tone="neutral">
          Three things the interface is ready for but cannot decide: whether phone sign-in returns the same neutral
          failure as email, whether linking a social provider to an existing password account requires re-entering
          the password, and how long a restriction review is expected to take so the copy can state it accurately.
        </Note>
      </div>
    </section>
  )
}
