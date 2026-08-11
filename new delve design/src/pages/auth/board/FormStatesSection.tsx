import { BoardGrid, Chip, Note, PreviewCard, SectionIntro, SpecTable } from './BoardKit'
import {
  AuthRequiredBottomSheet,
  AuthRequiredModal,
  Checkbox,
  FormErrorSummary,
  FullPageLoader,
  InlineAlert,
  OTPInput,
  PasswordField,
  PasswordRequirementList,
  PasswordStrength,
  PrimaryButton,
  SecondaryButton,
  SessionExpiredModal,
  SuccessPanel,
  TextButton,
  TextField,
} from '../../../components/auth'
import {
  authStateCatalog,
  buttonStateCatalog,
  fieldStateCatalog,
  recoveryStateCatalog,
} from '../../../data/authConfig'
import type { AuthStateDescriptor, FieldState } from '../../../data/authConfig'

const fieldStateCopy: Record<FieldState, { label: string; note: string }> = {
  default: { label: 'Default', note: 'Resting state, label above, hint below' },
  hover: { label: 'Hover', note: 'Border darkens to muted foreground' },
  focus: { label: 'Focus', note: '1px purple border plus 3px halo' },
  filled: { label: 'Filled', note: 'Value present, border returns to rest' },
  disabled: { label: 'Disabled', note: 'Subtle surface, 70% opacity, not focusable' },
  readOnly: { label: 'Read-only', note: 'Value visible and selectable, not editable' },
  error: { label: 'Error', note: 'Danger border, icon and message, aria-invalid' },
  success: { label: 'Success', note: 'Success border and check, used sparingly' },
  loading: { label: 'Loading', note: 'Inline spinner while the value is checked' },
}

function toneFor(descriptor: AuthStateDescriptor) {
  switch (descriptor.tone) {
    case 'success':
      return 'success' as const
    case 'warning':
      return 'warning' as const
    case 'error':
      return 'error' as const
    case 'info':
      return 'info' as const
    default:
      return 'info' as const
  }
}

export default function FormStatesSection() {
  return (
    <section aria-labelledby="form-states">
      <div id="form-states">
        <SectionIntro
          index="07"
          title="Form States"
          description="Every field, button and response state the auth system can enter, rendered from the same components the screens use. States are props — there is no duplicated copy of a field to keep in sync."
          meta="Figma · 08 Authentication / Form States"
        />
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Field states
          </h3>
          <BoardGrid min={280}>
            {fieldStateCatalog.map(state => (
              <PreviewCard key={state} title={fieldStateCopy[state].label} caption={fieldStateCopy[state].note}>
                <TextField
                  label="Email address"
                  value={
                    state === 'filled' || state === 'readOnly' || state === 'success' || state === 'loading'
                      ? 'traveler@example.com'
                      : state === 'error'
                        ? 'traveler@example'
                        : ''
                  }
                  placeholder="you@example.com"
                  onChange={() => {}}
                  previewState={state}
                  hint={state === 'default' || state === 'hover' ? 'We never share this.' : undefined}
                  error={state === 'error' ? 'Enter a valid email address' : undefined}
                  successMessage={state === 'success' ? 'Looks good' : undefined}
                />
              </PreviewCard>
            ))}
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Button states
          </h3>
          <BoardGrid min={240}>
            {buttonStateCatalog.map(state => (
              <PreviewCard key={state} title={state.charAt(0).toUpperCase() + state.slice(1)}>
                <div className="flex flex-col gap-2.5">
                  <PrimaryButton previewState={state}>Sign in</PrimaryButton>
                  <SecondaryButton previewState={state}>Back</SecondaryButton>
                  <TextButton previewState={state} align="center">
                    Forgot password?
                  </TextButton>
                </div>
              </PreviewCard>
            ))}
          </BoardGrid>
          <div className="mt-3">
            <Note title="Loading blocks a second submit" tone="neutral">
              A button in the loading state ignores clicks and sets <code>aria-busy</code>, so a double tap can never
              produce two sign-in attempts.
            </Note>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Password states
          </h3>
          <BoardGrid min={300}>
            <PreviewCard title="Empty" caption="No judgement before the traveler types">
              <PasswordField value="" onChange={() => {}} autoComplete="new-password" />
              <PasswordStrength value="" />
            </PreviewCard>
            <PreviewCard title="Weak" caption="Meets almost nothing in the policy">
              <PasswordField value="delve" onChange={() => {}} autoComplete="new-password" />
              <PasswordStrength value="delve" />
            </PreviewCard>
            <PreviewCard title="Fair" caption="Length reached, still missing classes">
              <PasswordField value="windhoektrip" onChange={() => {}} autoComplete="new-password" />
              <PasswordStrength value="windhoektrip" />
            </PreviewCard>
            <PreviewCard title="Strong" caption="Satisfies every backend rule">
              <PasswordField value="Coastal-Route-24" onChange={() => {}} autoComplete="new-password" />
              <PasswordStrength value="Coastal-Route-24" />
            </PreviewCard>
            <PreviewCard title="Requirements — in progress" caption="Rules generated from the config, not hard-coded">
              <PasswordRequirementList value="windhoektrip" />
            </PreviewCard>
            <PreviewCard title="Requirements — all met">
              <PasswordRequirementList value="Coastal-Route-24" />
            </PreviewCard>
            <PreviewCard title="Mismatch" caption="Confirmation errors appear on blur, not per keystroke">
              <PasswordField
                label="Confirm password"
                value="Coastal-Route-2"
                onChange={() => {}}
                error="Both passwords need to match"
                autoComplete="new-password"
              />
            </PreviewCard>
            <PreviewCard title="Match" caption="Success is quiet — one line, no celebration">
              <PasswordField
                label="Confirm password"
                value="Coastal-Route-24"
                onChange={() => {}}
                successMessage="Passwords match"
                autoComplete="new-password"
              />
            </PreviewCard>
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Code entry and consent
          </h3>
          <BoardGrid min={300}>
            <PreviewCard title="OTP · empty" caption="Six boxes, paste fills all of them">
              <OTPInput value="" onChange={() => {}} hint="Enter the code exactly as it appears." />
            </PreviewCard>
            <PreviewCard title="OTP · partial" caption="Auto-advance with backspace stepping back">
              <OTPInput value="24" onChange={() => {}} />
            </PreviewCard>
            <PreviewCard title="OTP · error" caption="Attempts remaining are always stated">
              <OTPInput value="248" onChange={() => {}} error="That code is not correct. 3 attempts left." />
            </PreviewCard>
            <PreviewCard title="OTP · disabled" caption="Locked after the attempt limit">
              <OTPInput value="" onChange={() => {}} disabled hint="Request a new code to try again." />
            </PreviewCard>
            <PreviewCard title="Consent · required" caption="Terms and privacy in one required control">
              <Checkbox
                checked={false}
                onChange={() => {}}
                required
                error="Accept the Terms and Privacy Policy to continue"
                label="I agree to the Terms of Service and acknowledge the Privacy Policy."
              />
            </PreviewCard>
            <PreviewCard title="Consent · optional marketing" caption="Always unchecked by default">
              <Checkbox
                checked={false}
                onChange={() => {}}
                label="Send me travel deals and Delve updates"
                description="Optional. You can change this at any time in your settings."
              />
            </PreviewCard>
            <PreviewCard title="Form error summary" caption="Rendered after a failed submit and linked to each field">
              <FormErrorSummary
                errors={[
                  { fieldId: 'signup-email', message: 'Enter a valid email address' },
                  { fieldId: 'signup-password', message: 'Your password does not meet all of the requirements yet' },
                  { fieldId: 'signup-consent', message: 'Accept the Terms and Privacy Policy to continue' },
                ]}
              />
            </PreviewCard>
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Authentication response states
          </h3>
          <BoardGrid min={320}>
            {authStateCatalog
              .filter(descriptor => !['idle', 'validating', 'submitting', 'fieldError'].includes(descriptor.state))
              .map(descriptor => (
                <PreviewCard key={descriptor.state} title={descriptor.label} tag={descriptor.state}>
                  <InlineAlert
                    tone={descriptor.state === 'offline' ? 'offline' : toneFor(descriptor)}
                    title={descriptor.label}
                  >
                    {descriptor.message}
                  </InlineAlert>
                </PreviewCard>
              ))}
            <PreviewCard title="Submitting" tag="submitting">
              <PrimaryButton loading loadingLabel="Signing you in…">
                Sign in
              </PrimaryButton>
            </PreviewCard>
            <PreviewCard title="Validating" tag="validating">
              <TextField label="Email address" value="traveler@example.com" onChange={() => {}} previewState="loading" hint="Checking availability…" />
            </PreviewCard>
            <PreviewCard title="Full page loader" tag="bootstrapping" padded={false}>
              <div style={{ height: 240 }}>
                <FullPageLoader message="Checking your session…" />
              </div>
            </PreviewCard>
            <PreviewCard title="Success panel" tag="success">
              <SuccessPanel title="Password updated" message="You can sign in with your new password now." />
            </PreviewCard>
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Interruption patterns
          </h3>
          <BoardGrid min={340}>
            <PreviewCard title="Auth required · dialog" caption="Guest tries to save a place on desktop" padded={false}>
              <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
                <AuthRequiredModal
                  open
                  contained
                  action="save"
                  destinationLabel="Beachfront Bungalow"
                  onSignIn={() => {}}
                  onCreateAccount={() => {}}
                  onClose={() => {}}
                />
              </div>
            </PreviewCard>
            <PreviewCard title="Auth required · bottom sheet" caption="Same decision, thumb-reachable on mobile" padded={false}>
              <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
                <AuthRequiredBottomSheet
                  open
                  contained
                  action="book"
                  onSignIn={() => {}}
                  onCreateAccount={() => {}}
                  onClose={() => {}}
                />
              </div>
            </PreviewCard>
            <PreviewCard title="Session expired · dialog" caption="Blocking: no backdrop dismissal, no close button" padded={false}>
              <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
                <SessionExpiredModal open contained destinationLabel="your booking" onSignIn={() => {}} />
              </div>
            </PreviewCard>
          </BoardGrid>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
            Recovery states
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {recoveryStateCatalog.map(descriptor => (
              <Chip key={descriptor.state} tone={descriptor.state === 'passwordUpdated' ? 'success' : 'neutral'}>
                {descriptor.label}
              </Chip>
            ))}
          </div>
          <SpecTable
            columns={['State', 'Traveler sees', 'Rule']}
            rows={recoveryStateCatalog.map(descriptor => [
              descriptor.label,
              descriptor.message,
              descriptor.state === 'requestSubmitted'
                ? 'Identical response whether or not the account exists'
                : descriptor.state === 'tooManyAttempts'
                  ? 'Attempt limit comes from the backend config'
                  : descriptor.state === 'codeExpired' || descriptor.state === 'codeAlreadyUsed'
                    ? 'Codes are single use and time limited'
                    : 'Contact details stay masked throughout',
            ])}
          />
        </div>
      </div>
    </section>
  )
}
