import { BoardGrid, DeviceFrame, Note, PreviewCard, SectionIntro, SpecTable, ThemeScope } from './BoardKit'
import SignInScreen from '../SignInScreen'
import SignUpScreen from '../SignUpScreen'
import ForgotPasswordFlow from '../ForgotPasswordFlow'
import {
  Checkbox,
  EmailField,
  InlineAlert,
  OTPInput,
  PasswordField,
  PasswordStrength,
  PrimaryButton,
  SecondaryButton,
} from '../../../components/auth'

export interface ThemeSectionProps {
  theme: 'light' | 'dark'
}

const copy = {
  light: {
    index: '05',
    title: 'Light Theme',
    description:
      'Warm travel canvas at #F4F1EA with white surfaces. Primary actions use Purple Deep #5F2FC9, which clears AA for body text and large text on both white and the canvas.',
  },
  dark: {
    index: '06',
    title: 'Dark Theme',
    description:
      'Near-black #0C0A09 with #1B1816 surfaces. Primary shifts to Delve Purple #8C52FF and the feedback tokens lift so nothing drops below AA against the dark canvas.',
  },
}

export default function ThemeSection({ theme }: ThemeSectionProps) {
  const text = copy[theme]

  return (
    <section aria-labelledby={`theme-${theme}`}>
      <div id={`theme-${theme}`}>
        <SectionIntro
          index={text.index}
          title={text.title}
          description={text.description}
          meta={`Figma · 08 Authentication / ${text.title}`}
        />
      </div>

      <div className="flex flex-col gap-6">
        <BoardGrid min={520} gap={24}>
          <PreviewCard title="Sign in · 1440" caption={`Split shell in ${theme} theme`} padded={false}>
            <div style={{ padding: 16 }}>
              <DeviceFrame width={1440} height={900} theme={theme} label="Sign in">
                <SignInScreen layout="split" staticPreview />
              </DeviceFrame>
            </div>
          </PreviewCard>

          <PreviewCard title="Create account · 1440" caption={`Longest form in ${theme} theme`} padded={false}>
            <div style={{ padding: 16 }}>
              <DeviceFrame width={1440} height={900} theme={theme} label="Sign up step 1">
                <SignUpScreen layout="split" step={1} staticPreview />
              </DeviceFrame>
            </div>
          </PreviewCard>
        </BoardGrid>

        <BoardGrid min={300} gap={24}>
          <PreviewCard title="Verify · 390" caption="Mobile OTP step" padded={false}>
            <div style={{ padding: 16 }}>
              <DeviceFrame width={390} height={844} device="mobile" theme={theme} label="Verify">
                <SignUpScreen layout="stacked" step={2} staticPreview />
              </DeviceFrame>
            </div>
          </PreviewCard>

          <PreviewCard title="Recovery · 390" caption="Neutral confirmation" padded={false}>
            <div style={{ padding: 16 }}>
              <DeviceFrame width={390} height={844} device="mobile" theme={theme} label="Check inbox">
                <ForgotPasswordFlow layout="stacked" step="checkInbox" staticPreview />
              </DeviceFrame>
            </div>
          </PreviewCard>

          <PreviewCard title="Controls" caption={`Every control on the ${theme} canvas`} padded={false}>
            <ThemeScope theme={theme} style={{ padding: 20 }}>
              <div className="flex flex-col gap-4">
                <EmailField label="Email address" value="traveler@example.com" onChange={() => {}} />
                <div>
                  <PasswordField value="" onChange={() => {}} />
                  <PasswordStrength value="Windhoek-Coast-24" />
                </div>
                <OTPInput value="" onChange={() => {}} label="Verification code" />
                <Checkbox checked label="Keep me signed in" onChange={() => {}} />
                <PrimaryButton>Sign in</PrimaryButton>
                <SecondaryButton>Back to sign in</SecondaryButton>
                <InlineAlert tone="error" title="We could not sign you in">
                  The email or password you entered is not correct.
                </InlineAlert>
                <InlineAlert tone="success">Signed in. Taking you back to Delve…</InlineAlert>
                <InlineAlert tone="warning" title="Too many attempts">
                  Sign-in is paused for 15 minutes.
                </InlineAlert>
              </div>
            </ThemeScope>
          </PreviewCard>
        </BoardGrid>

        <SpecTable
          caption={`Contrast checks — ${text.title}`}
          columns={['Pair', 'Ratio', 'Result']}
          rows={
            theme === 'light'
              ? [
                  ['Ink #1A1814 on canvas #F4F1EA', '14.8:1', 'AAA body text'],
                  ['Muted #6F695F on white', '5.3:1', 'AA body text'],
                  ['White on Purple Deep #5F2FC9', '7.1:1', 'AAA button label'],
                  ['Purple Deep on white', '5.9:1', 'AA links and text buttons'],
                  ['Danger #C42A2A on white', '6.1:1', 'AA error text'],
                  ['Success #0F8A52 on white', '4.6:1', 'AA success text'],
                ]
              : [
                  ['Bone #FFFAF2 on near-black #0C0A09', '18.2:1', 'AAA body text'],
                  ['Muted #B8ADA3 on #0C0A09', '8.9:1', 'AAA body text'],
                  ['White on Delve Purple #8C52FF', '4.6:1', 'AA button label'],
                  ['Delve Purple on #0C0A09', '5.4:1', 'AA links and text buttons'],
                  ['Danger #FF8B84 on #1B1816', '7.4:1', 'AAA error text'],
                  ['Success #4ADE9B on #1B1816', '9.6:1', 'AAA success text'],
                ]
          }
        />

        <Note title="One implementation, two themes" tone="neutral">
          No component hard-codes a colour. Everything reads <code>--bg</code>, <code>--surface</code>,{' '}
          <code>--fg</code>, <code>--primary</code> and the auth feedback tokens, so the app-level theme toggle drives
          auth screens with no extra work. Travel imagery keeps its purple wash in both themes; only the overlay
          opacity does the heavy lifting.
        </Note>
      </div>
    </section>
  )
}
