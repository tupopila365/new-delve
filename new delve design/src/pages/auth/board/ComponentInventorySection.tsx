import { BoardGrid, Note, PreviewCard, SectionIntro, SpecTable } from './BoardKit'
import {
  AuthHeader,
  AuthTitleBlock,
  CountryCodeSelector,
  InlineAlert,
  LoadingSpinner,
  PhoneField,
  ResendCodeControl,
  SessionCard,
  SupportLink,
  TermsAndPrivacyText,
  TravelImagePanel,
} from '../../../components/auth'

const inventory: Array<[string, string, string]> = [
  ['AuthShell', 'layout: auto | split | stacked · imageSide · showImagePanel · formWidth · decorativeHeader', 'Page frame for every auth screen'],
  ['AuthHeader', 'onBack · onClose · trailing · step { current, total }', 'Top bar with progress for multi-step flows'],
  ['DelveLogo', 'size: sm | md | lg · tone: brand | onImage | mono · showMark · showWordmark', 'Brand mark, adapts to imagery'],
  ['TravelImagePanel', 'image: dunes | coast · overlay: soft | strong · headline · supporting', 'Generated travel imagery with purple wash'],
  ['AuthTitleBlock', 'title · subtitle · eyebrow · icon · align · size', 'Screen heading and supporting copy'],
  ['AuthForm', 'onSubmit · busy · gap', 'Form element that swallows a submit while busy'],
  ['TextField / AuthField', '9 field states via previewState · label · hint · error · successMessage · leading · trailing', 'Base input every other field builds on'],
  ['EmailField', 'Inherits TextField · email keyboard and autocomplete', 'Email entry'],
  ['PhoneField', 'countryCode · optionalLabel · per-country length hint', 'Dial code selector plus national number'],
  ['CountryCodeSelector', 'value · countries from config · disabled', 'Standalone dial code control'],
  ['PasswordField', 'autoComplete: current | new · show/hide · Caps Lock warning', 'Password entry with reveal control'],
  ['PasswordStrength', 'value or evaluation · showLabel', 'Four-segment meter driven by the policy'],
  ['PasswordRequirementList', 'value · requirements · columns: 1 | 2 · showState', 'Live checklist generated from config'],
  ['Checkbox', 'checked · label · description · error · required', 'Consent and preference control'],
  ['PrimaryButton / AuthSubmitButton', '6 button states · size · loading · iconLeft/Right · fullWidth', 'Main action'],
  ['SecondaryButton', 'Same state matrix as PrimaryButton', 'Alternate action'],
  ['TextButton', 'tone: brand | muted · align · size', 'Inline navigation and low-emphasis actions'],
  ['OTPInput', 'length from config · paste · auto-advance · error · success · disabled', 'One-time code entry'],
  ['ResendCodeControl', 'cooldownSeconds from config · sending · resetToken', 'Countdown and resend action'],
  ['InlineAlert / AuthStatusPanel', 'tone: info | success | warning | error | offline | security · title · action · onDismiss', 'In-form feedback'],
  ['FormErrorSummary / AuthErrorSummary', 'errors[] linked to field ids', 'Post-submit summary for screen readers'],
  ['SuccessPanel', 'title · message · primaryAction · secondaryAction', 'Terminal success states'],
  ['SessionCard', 'session summary · current badge · revoke', 'Active session device row'],
  ['ConfirmationDialog', 'title · description · confirm/cancel · busy', 'Destructive confirmation'],
  ['AuthRequiredModal', 'action: save | book | join | message | generic · destinationLabel', 'Guest interception on desktop'],
  ['AuthRequiredBottomSheet', 'Same actions, sheet presentation', 'Guest interception on mobile'],
  ['SessionExpiredModal', 'destinationLabel · blocking, not dismissible', 'Idle timeout interruption'],
  ['ModalOverlay', 'presentation: dialog | sheet · dismissible · contained', 'Shared dialog primitive'],
  ['LoadingSpinner', 'size · color · thickness · label', 'Inline busy indicator'],
  ['FullPageLoader', 'variant: page | overlay · message', 'Session bootstrap and blocking waits'],
  ['TermsAndPrivacyText', 'variant: inline | consent · actionLabel', 'Legal copy, reused as checkbox label'],
  ['SupportLink', 'variant: inline | card · referenceId', 'Support contact with a quotable reference'],
  ['AuthThemeToggle', 'variant: full | compact', 'Theme control for auth headers'],
]

export default function ComponentInventorySection() {
  return (
    <section aria-labelledby="component-inventory">
      <div id="component-inventory">
        <SectionIntro
          index="02·C"
          title="Component Inventory"
          description="The reusable set that belongs in Figma page 02 Components. Every visual difference is a prop — there are no duplicate components for hover, error or loading variants."
          meta="Figma · 02 Components / Authentication"
        />
      </div>

      <div className="flex flex-col gap-6">
        <Note title="Variants are props, not copies" tone="neutral">
          A field has one implementation and nine states. A button has one implementation and six. Adding a tenth
          state means one change in one file, and every screen picks it up.
        </Note>

        <SpecTable
          columns={['Component', 'Variants and key props', 'Purpose']}
          rows={inventory.map(([name, props, purpose]) => [name, props, purpose])}
        />

        <BoardGrid min={300}>
          <PreviewCard title="AuthHeader with step progress">
            <AuthHeader onBack={() => {}} step={{ current: 2, total: 3, label: 'Verify identity' }} />
          </PreviewCard>
          <PreviewCard title="AuthTitleBlock with icon">
            <AuthTitleBlock
              eyebrow="Step 2 of 3"
              title="Verify it is you"
              subtitle="We sent a six-digit code to your inbox."
            />
          </PreviewCard>
          <PreviewCard title="PhoneField with dial code">
            <PhoneField countryCode="NA" value="" onChange={() => {}} optionalLabel />
          </PreviewCard>
          <PreviewCard title="CountryCodeSelector">
            <CountryCodeSelector value="NA" onChange={() => {}} />
          </PreviewCard>
          <PreviewCard title="SessionCard">
            <SessionCard
              session={{
                id: 's1',
                isCurrent: true,
                description: 'Chrome on Windows',
                browserName: 'Chrome',
                browserMajorVersion: 120,
                operatingSystem: 'Windows',
                deviceType: 'desktop',
                deviceLabel: null,
                approximateLocation: null,
                locationUnavailable: true,
                lastActivityAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
                status: 'active',
              }}
            />
          </PreviewCard>
          <PreviewCard title="ResendCodeControl">
            <ResendCodeControl onResend={() => {}} startImmediately={false} />
          </PreviewCard>
          <PreviewCard title="InlineAlert with action">
            <InlineAlert tone="warning" title="Verify your email to continue">
              Your account exists but the email address has not been confirmed yet.
            </InlineAlert>
          </PreviewCard>
          <PreviewCard title="SupportLink card">
            <SupportLink variant="card" referenceId="DLV-8F42-7C19" />
          </PreviewCard>
          <PreviewCard title="TermsAndPrivacyText">
            <TermsAndPrivacyText actionLabel="creating an account" />
          </PreviewCard>
          <PreviewCard title="LoadingSpinner">
            <div className="flex items-center gap-4" style={{ color: 'var(--primary)' }}>
              <LoadingSpinner size={16} />
              <LoadingSpinner size={22} thickness={3} />
              <LoadingSpinner size={30} thickness={3} />
            </div>
          </PreviewCard>
          <PreviewCard title="TravelImagePanel · coast" padded={false}>
            <div style={{ height: 300 }}>
              <TravelImagePanel image="coast" headline="Take the long way round." supporting="" />
            </div>
          </PreviewCard>
          <PreviewCard title="TravelImagePanel · dunes" padded={false}>
            <div style={{ height: 300 }}>
              <TravelImagePanel image="dunes" overlay="soft" headline="First light, no one else." supporting="" />
            </div>
          </PreviewCard>
        </BoardGrid>
      </div>
    </section>
  )
}
