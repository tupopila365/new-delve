import type { ReactNode } from 'react'
import { BoardGrid, DeviceFrame, Note, PreviewCard, SectionIntro } from './BoardKit'
import SignInScreen from '../SignInScreen'
import SignUpScreen from '../SignUpScreen'
import ForgotPasswordFlow from '../ForgotPasswordFlow'
import EmailVerificationScreen from '../EmailVerificationScreen'
import PhoneVerificationScreen from '../PhoneVerificationScreen'
import SessionExpiredScreen from '../SessionExpiredScreen'
import SocialConflictScreen from '../SocialConflictScreen'
import AccountRestrictedScreen from '../AccountRestrictedScreen'
import type { AuthShellLayout } from '../../../components/auth/AuthShell'

export type BoardViewport = 'desktop' | 'tablet' | 'mobile'

interface ViewportSpec {
  index: string
  width: number
  height: number
  layout: AuthShellLayout
  title: string
  description: string
  columns: number
}

const specs: Record<BoardViewport, ViewportSpec> = {
  desktop: {
    index: '02',
    width: 1440,
    height: 900,
    layout: 'split',
    title: 'Desktop Screens · 1440',
    description:
      'The full split-screen treatment: generated travel imagery under a purple wash on one side, a calm 460px form column on the other. Frames are live components rendered at true size and scaled to fit this board.',
    columns: 640,
  },
  tablet: {
    index: '03',
    width: 1024,
    height: 1180,
    layout: 'split',
    title: 'Tablet Screens · 1024',
    description:
      'At 1024 the split holds but the image panel becomes a tall column. Form width is unchanged, so line length and tap targets stay identical to desktop.',
    columns: 460,
  },
  mobile: {
    index: '04',
    width: 390,
    height: 844,
    layout: 'stacked',
    title: 'Mobile Screens · 390',
    description:
      'The image panel drops away and a soft purple glow sits behind the header instead. Every control keeps its 44px minimum, and primary actions stay within thumb reach at the bottom of the form.',
    columns: 300,
  },
}

interface FrameEntry {
  id: string
  title: string
  caption: string
  node: ReactNode
  viewports: BoardViewport[]
}

function buildFrames(layout: AuthShellLayout): FrameEntry[] {
  const shared = { layout, staticPreview: true } as const

  return [
    {
      id: 'sign-in',
      title: 'Sign in',
      caption: 'Welcome back, email or phone, password with show/hide, keep me signed in, social providers.',
      node: <SignInScreen {...shared} />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'sign-up-1',
      title: 'Sign up · Step 1 create account',
      caption: 'Names, email, optional country and phone, password with live requirements, required consent.',
      node: <SignUpScreen {...shared} step={1} />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'sign-up-2',
      title: 'Sign up · Step 2 verify identity',
      caption: 'Six-digit code to a masked address, resend cooldown, change contact, switch channel.',
      node: <SignUpScreen {...shared} step={2} />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'sign-up-3',
      title: "Sign up · Step 3 you're ready to Delve",
      caption: 'Confirmation with two exits — start exploring or set up a profile. No preference onboarding.',
      node: <SignUpScreen {...shared} step={3} />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'forgot-request',
      title: 'Forgot password · Request',
      caption: 'Single email field. The response is identical whether or not the account exists.',
      node: <ForgotPasswordFlow {...shared} step="request" />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'forgot-inbox',
      title: 'Forgot password · Check inbox',
      caption: 'Neutral confirmation with a masked address and an explanation of why it is worded that way.',
      node: <ForgotPasswordFlow {...shared} step="checkInbox" />,
      viewports: ['desktop', 'mobile'],
    },
    {
      id: 'forgot-code',
      title: 'Forgot password · Enter recovery code',
      caption: 'Six-digit input with paste support, attempt counter and resend.',
      node: <ForgotPasswordFlow {...shared} step="enterCode" />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'forgot-new-password',
      title: 'Forgot password · Create new password',
      caption: 'Strength meter and requirement list driven by the backend policy, plus confirmation field.',
      node: <ForgotPasswordFlow {...shared} step="createPassword" />,
      viewports: ['desktop', 'mobile'],
    },
    {
      id: 'forgot-updated',
      title: 'Forgot password · Password updated',
      caption: 'Success panel that states other devices have been signed out.',
      node: <ForgotPasswordFlow {...shared} step="updated" />,
      viewports: ['desktop', 'mobile'],
    },
    {
      id: 'email-verification',
      title: 'Email verification',
      caption: 'Link landing screen with resend, change address and support.',
      node: <EmailVerificationScreen {...shared} variant="pending" />,
      viewports: ['desktop', 'tablet', 'mobile'],
    },
    {
      id: 'email-verification-expired',
      title: 'Email verification · Expired link',
      caption: 'Reassures that nothing is lost and offers a fresh link.',
      node: <EmailVerificationScreen {...shared} variant="expired" />,
      viewports: ['desktop'],
    },
    {
      id: 'phone-verification',
      title: 'Phone verification',
      caption: 'SMS code to a masked number. Voice fallback only renders when the config enables it.',
      node: <PhoneVerificationScreen {...shared} />,
      viewports: ['desktop', 'mobile'],
    },
    {
      id: 'session-expired',
      title: 'Session expired',
      caption: 'Full-page version for a cold open, with the return destination named.',
      node: <SessionExpiredScreen layout={layout} destinationLabel="your saved stays" />,
      viewports: ['desktop', 'mobile'],
    },
    {
      id: 'social-conflict',
      title: 'Social account conflict',
      caption: 'Reached only after the provider confirmed the address, so naming the existing method is safe.',
      node: <SocialConflictScreen {...shared} />,
      viewports: ['desktop', 'tablet'],
    },
    {
      id: 'account-restricted',
      title: 'Account restricted',
      caption: 'Support contact plus a quotable reference ID. Never explains the internal reason.',
      node: <AccountRestrictedScreen layout={layout} />,
      viewports: ['desktop', 'mobile'],
    },
  ]
}

export interface ScreensSectionProps {
  viewport: BoardViewport
}

export default function ScreensSection({ viewport }: ScreensSectionProps) {
  const spec = specs[viewport]
  const frames = buildFrames(spec.layout).filter(frame => frame.viewports.includes(viewport))

  return (
    <section aria-labelledby={`screens-${viewport}`}>
      <div id={`screens-${viewport}`}>
        <SectionIntro
          index={spec.index}
          title={spec.title}
          description={spec.description}
          meta={`Figma · 08 Authentication / ${spec.title}`}
        />
      </div>

      <div className="mb-6">
        <Note title="These are the real components" tone="neutral">
          Each frame mounts the same screen the prototype uses, at {spec.width}px wide, scaled down to fit. Timers are
          paused inside static frames so countdowns do not run in the background.
        </Note>
      </div>

      <BoardGrid min={spec.columns} gap={24}>
        {frames.map(frame => (
          <PreviewCard key={frame.id} title={frame.title} caption={frame.caption} padded={false}>
            <div style={{ padding: 16 }}>
              <DeviceFrame
                width={spec.width}
                height={spec.height}
                device={viewport}
                label={frame.title}
              >
                {frame.node}
              </DeviceFrame>
            </div>
          </PreviewCard>
        ))}
      </BoardGrid>
    </section>
  )
}
