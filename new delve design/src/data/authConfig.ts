/**
 * Delve Traveler — Authentication data contract (mock).
 *
 * Everything in this file stands in for values the backend owns. The UI must
 * read rules from here instead of hard-coding them, so that when the real
 * configuration endpoint is wired up nothing in the components has to change.
 * No endpoints are declared here on purpose — the backend team defines those.
 */

// ─── Identity ─────────────────────────────────────────────────────────────

export type AccountStatus =
  | 'active'
  | 'pendingVerification'
  | 'restricted'
  | 'disabled'

export type IdentityProvider = 'password' | 'google' | 'apple' | 'phone'

export type ProfileCompletionStatus = 'incomplete' | 'basic' | 'complete'
export type PreferredTheme = 'light' | 'dark' | 'system'

/** Traveler account shape. Backend is authoritative for every field. */
export interface User {
  id: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  /** Presentation-only; never echo the full address in recovery or verification. */
  maskedEmail: string
  emailVerified: boolean
  phoneCountryCode: string | null
  phoneNumber: string | null
  maskedPhone: string | null
  phoneVerified: boolean
  avatarUrl: string | null
  homeCity: string | null
  accountStatus: AccountStatus
  /** Alias for linkedProviders — methods the traveler can use to sign in. */
  authenticationMethods: IdentityProvider[]
  linkedProviders: IdentityProvider[]
  profileCompletionStatus: ProfileCompletionStatus
  preferredTheme: PreferredTheme
  marketingOptIn: boolean
  termsAcceptedAt: string | null
  privacyAcknowledgedAt: string | null
  createdAt: string
  lastSignInAt: string | null
}

// ─── Password policy ──────────────────────────────────────────────────────

export interface PasswordRules {
  minimumLength: number
  maximumLength: number
  requireLowercase: boolean
  requireUppercase: boolean
  requireNumber: boolean
  requireSymbol: boolean
  blockCommonPasswords: boolean
  requireConfirmation: boolean
}

export interface PasswordRequirement {
  id: string
  label: string
  test: (value: string) => boolean
}

// ─── Social providers ─────────────────────────────────────────────────────

export type SocialProviderId = 'google' | 'apple' | 'phone'

export interface SocialProvider {
  id: SocialProviderId
  label: string
  /** Providers only render when the backend reports them enabled. */
  enabled: boolean
}

// ─── Verification ─────────────────────────────────────────────────────────

export type VerificationChannel = 'email' | 'sms' | 'voice'

export interface VerificationSettings {
  otpLength: number
  otpExpiryMinutes: number
  resendCooldownSeconds: number
  maximumAttempts: number
  channels: VerificationChannel[]
  /** Sign-up step 2 may verify by phone only when the backend supports it. */
  phoneVerificationSupported: boolean
  /** Voice call fallback is config-gated; never surface it otherwise. */
  voiceCallFallbackEnabled: boolean
}

// ─── Configuration ────────────────────────────────────────────────────────

export interface CountryDialCode {
  code: string
  dialCode: string
  label: string
  flag: string
  exampleLength: number
}

export type SignInMethod = 'password' | 'google' | 'apple' | 'phone'
export type VerificationMethod = 'email' | 'sms' | 'voice'

export interface AuthConfiguration {
  /** Which sign-in methods the backend currently exposes. */
  enabledSignInMethods: SignInMethod[]
  passwordRules: PasswordRules
  socialProviders: SocialProvider[]
  verification: VerificationSettings
  verificationMethods: VerificationMethod[]
  otpLength: number
  resendCooldownSeconds: number
  maximumAttempts: number
  /** Failed sign-in attempts before the account is temporarily locked. */
  maximumSignInAttempts: number
  lockoutMinutes: number
  sessionIdleTimeoutMinutes: number
  rememberMeDurationDays: number
  allowPhoneSignIn: boolean
  requireTermsAcceptance: boolean
  requirePrivacyAcknowledgement: boolean
  termsVersion: string
  privacyVersion: string
  /** When false, the marketing checkbox is not rendered at all. */
  marketingConsentEnabled: boolean
  /** Marketing consent is always optional and never pre-checked. */
  marketingOptInDefault: false
  supportEmail: string
  supportHoursLabel: string
  termsUrl: string
  privacyUrl: string
  countries: CountryDialCode[]
  defaultCountryCode: string
}

export const authConfig: AuthConfiguration = {
  enabledSignInMethods: ['password'],
  passwordRules: {
    minimumLength: 8,
    maximumLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: false,
    blockCommonPasswords: true,
    requireConfirmation: true,
  },
  socialProviders: [],
  verification: {
    otpLength: 6,
    otpExpiryMinutes: 10,
    resendCooldownSeconds: 45,
    maximumAttempts: 5,
    channels: ['email'],
    phoneVerificationSupported: false,
    voiceCallFallbackEnabled: false,
  },
  verificationMethods: ['email'],
  otpLength: 6,
  resendCooldownSeconds: 45,
  maximumAttempts: 5,
  maximumSignInAttempts: 5,
  lockoutMinutes: 15,
  sessionIdleTimeoutMinutes: 30,
  rememberMeDurationDays: 30,
  allowPhoneSignIn: false,
  requireTermsAcceptance: true,
  requirePrivacyAcknowledgement: true,
  termsVersion: '2026.04',
  privacyVersion: '2026.04',
  marketingConsentEnabled: true,
  marketingOptInDefault: false,
  supportEmail: 'support@delve.travel',
  supportHoursLabel: 'Mon–Sat, 08:00–18:00 CAT',
  termsUrl: '#terms',
  privacyUrl: '#privacy',
  countries: [
    { code: 'NA', dialCode: '+264', label: 'Namibia', flag: '🇳🇦', exampleLength: 9 },
    { code: 'ZA', dialCode: '+27', label: 'South Africa', flag: '🇿🇦', exampleLength: 9 },
    { code: 'BW', dialCode: '+267', label: 'Botswana', flag: '🇧🇼', exampleLength: 8 },
    { code: 'ZM', dialCode: '+260', label: 'Zambia', flag: '🇿🇲', exampleLength: 9 },
    { code: 'ZW', dialCode: '+263', label: 'Zimbabwe', flag: '🇿🇼', exampleLength: 9 },
    { code: 'AO', dialCode: '+244', label: 'Angola', flag: '🇦🇴', exampleLength: 9 },
    { code: 'DE', dialCode: '+49', label: 'Germany', flag: '🇩🇪', exampleLength: 11 },
    { code: 'GB', dialCode: '+44', label: 'United Kingdom', flag: '🇬🇧', exampleLength: 10 },
    { code: 'US', dialCode: '+1', label: 'United States', flag: '🇺🇸', exampleLength: 10 },
  ],
  defaultCountryCode: 'NA',
}

// ─── Response and recovery states ─────────────────────────────────────────

/** Every state an auth surface can be in. Drives the Form States section. */
export type AuthResponseState =
  | 'idle'
  | 'validating'
  | 'submitting'
  | 'success'
  | 'fieldError'
  | 'formError'
  | 'invalidCredentials'
  | 'verificationRequired'
  | 'unverifiedEmail'
  | 'accountRestricted'
  | 'accountDisabled'
  | 'rateLimited'
  | 'socialFailure'
  | 'offline'
  | 'networkError'
  | 'serverError'
  | 'serverUnavailable'
  | 'sessionExpired'

export interface AuthStateDescriptor {
  state: AuthResponseState
  label: string
  /** Copy shown to the traveler. Deliberately non-enumerating. */
  message: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'error'
}

export const authStateCatalog: AuthStateDescriptor[] = [
  { state: 'idle', label: 'Idle', message: 'Form is ready for input.', tone: 'neutral' },
  { state: 'validating', label: 'Validating', message: 'Checking the details you entered.', tone: 'info' },
  { state: 'submitting', label: 'Submitting', message: 'Signing you in…', tone: 'info' },
  { state: 'success', label: 'Success', message: "You're in. Taking you back to Delve.", tone: 'success' },
  { state: 'fieldError', label: 'Field error', message: 'One or more fields need attention.', tone: 'error' },
  { state: 'formError', label: 'Form error', message: 'Something went wrong. Please try again.', tone: 'error' },
  {
    state: 'invalidCredentials',
    label: 'Invalid credentials',
    message: "That email or password doesn't match our records.",
    tone: 'error',
  },
  {
    state: 'verificationRequired',
    label: 'Verification required',
    message: 'Verify your identity to continue.',
    tone: 'warning',
  },
  {
    state: 'unverifiedEmail',
    label: 'Unverified email',
    message: 'Verify your email address to finish signing in.',
    tone: 'warning',
  },
  {
    state: 'accountRestricted',
    label: 'Account restricted',
    message: 'This account is currently restricted. Our support team can help.',
    tone: 'error',
  },
  {
    state: 'accountDisabled',
    label: 'Account disabled',
    message: 'This account is no longer available. Contact support if you need help.',
    tone: 'error',
  },
  {
    state: 'rateLimited',
    label: 'Rate limited',
    message: 'Too many attempts. Please wait a few minutes before trying again.',
    tone: 'warning',
  },
  {
    state: 'socialFailure',
    label: 'Social failure',
    message: "We couldn't complete that sign-in. Please try again or use your email.",
    tone: 'error',
  },
  { state: 'offline', label: 'Offline', message: "You're offline. Check your connection and try again.", tone: 'warning' },
  {
    state: 'networkError',
    label: 'Network error',
    message: "We couldn't reach Delve. Check your connection and try again.",
    tone: 'warning',
  },
  {
    state: 'serverError',
    label: 'Server error',
    message: 'Something went wrong on our side. Please try again shortly.',
    tone: 'error',
  },
  {
    state: 'serverUnavailable',
    label: 'Server unavailable',
    message: "Delve isn't reachable right now. Please try again shortly.",
    tone: 'error',
  },
  {
    state: 'sessionExpired',
    label: 'Session expired',
    message: 'For your security we signed you out after a period of inactivity.',
    tone: 'warning',
  },
]

/** Password recovery is deliberately neutral: it never confirms account existence. */
export type RecoveryState =
  | 'requestAccepted'
  | 'requestIdentifier'
  | 'requestSubmitted'
  | 'codeRequired'
  | 'linkSent'
  | 'codeSent'
  | 'invalidCode'
  | 'codeInvalid'
  | 'expiredCode'
  | 'codeExpired'
  | 'expiredLink'
  | 'codeAlreadyUsed'
  | 'maximumAttemptsReached'
  | 'tooManyAttempts'
  | 'createNewPassword'
  | 'passwordUpdated'

export interface RecoveryStateDescriptor {
  state: RecoveryState
  label: string
  message: string
}

export const recoveryStateCatalog: RecoveryStateDescriptor[] = [
  {
    state: 'requestIdentifier',
    label: 'Request recovery',
    message: 'Enter the email address on your Delve account.',
  },
  {
    state: 'requestAccepted',
    label: 'Request accepted',
    message: 'If an account matches those details, recovery instructions are on their way.',
  },
  {
    state: 'requestSubmitted',
    label: 'Neutral confirmation',
    message: 'If an account matches those details, a recovery code is on its way.',
  },
  { state: 'linkSent', label: 'Link sent', message: 'Open the recovery link we sent, or enter the code below.' },
  { state: 'codeRequired', label: 'Code required', message: 'Enter the recovery code to continue.' },
  { state: 'codeSent', label: 'Code sent', message: 'Enter the code we sent to your inbox.' },
  { state: 'invalidCode', label: 'Invalid code', message: "That code isn't right. Check it and try again." },
  { state: 'codeInvalid', label: 'Code invalid', message: "That code isn't right. Check it and try again." },
  { state: 'expiredCode', label: 'Expired code', message: 'That code has expired. Request a new one.' },
  { state: 'codeExpired', label: 'Code expired', message: 'That code has expired. Request a new one.' },
  { state: 'expiredLink', label: 'Expired link', message: 'That recovery link has expired. Request a new one.' },
  { state: 'codeAlreadyUsed', label: 'Code already used', message: 'That code has already been used.' },
  {
    state: 'maximumAttemptsReached',
    label: 'Maximum attempts reached',
    message: 'Too many attempts. Request a new code in a few minutes.',
  },
  {
    state: 'tooManyAttempts',
    label: 'Too many attempts',
    message: 'Too many attempts. Request a new code in a few minutes.',
  },
  { state: 'createNewPassword', label: 'Create new password', message: 'Choose a new password for your account.' },
  { state: 'passwordUpdated', label: 'Password updated', message: 'Your password has been updated.' },
]

// ─── Field and button state catalogs (design board) ───────────────────────

export type FieldState =
  | 'default'
  | 'hover'
  | 'focus'
  | 'filled'
  | 'disabled'
  | 'readOnly'
  | 'error'
  | 'success'
  | 'loading'

export const fieldStateCatalog: FieldState[] = [
  'default',
  'hover',
  'focus',
  'filled',
  'disabled',
  'readOnly',
  'error',
  'success',
  'loading',
]

export type ButtonState = 'default' | 'hover' | 'pressed' | 'focus' | 'loading' | 'disabled'

export const buttonStateCatalog: ButtonState[] = [
  'default',
  'hover',
  'pressed',
  'focus',
  'loading',
  'disabled',
]

// ─── Masking helpers ──────────────────────────────────────────────────────

/** Masks a local part and domain so recovery screens never echo a full address. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  if (!domain) return '•••••'
  const [host = '', ...tldParts] = domain.split('.')
  const tld = tldParts.join('.')
  const keep = (value: string, visible: number) =>
    value.length <= visible ? value : `${value.slice(0, visible)}${'•'.repeat(Math.min(6, value.length - visible))}`
  return `${keep(local, 2)}@${keep(host, 1)}${tld ? `.${tld}` : ''}`
}

/** Keeps the dial code and last two digits only. */
export function maskPhone(dialCode: string, number: string): string {
  const tail = number.slice(-2)
  const hidden = '•'.repeat(Math.max(3, number.length - 2))
  return `${dialCode} ${hidden}${tail}`
}

/** Sample masked values for design documentation — never real traveler data. */
export const sampleMaskedEmail = maskEmail('traveler@example.com')
export const sampleMaskedPhone = maskPhone('+264', '811234567')

/** Placeholder used anywhere a secret would otherwise be shown. */
export const secretPlaceholder = '••••••'

// ─── Validation ───────────────────────────────────────────────────────────

const emailPattern = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim())
}

export function isValidPhone(value: string, expectedLength: number): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= Math.max(6, expectedLength - 2) && digits.length <= expectedLength + 2
}

export function buildPasswordRequirements(rules: PasswordRules): PasswordRequirement[] {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: `At least ${rules.minimumLength} characters`,
      test: value => value.length >= rules.minimumLength,
    },
  ]
  if (rules.requireLowercase) {
    requirements.push({ id: 'lowercase', label: 'One lowercase letter', test: value => /[a-z]/.test(value) })
  }
  if (rules.requireUppercase) {
    requirements.push({ id: 'uppercase', label: 'One uppercase letter', test: value => /[A-Z]/.test(value) })
  }
  if (rules.requireNumber) {
    requirements.push({ id: 'number', label: 'One number', test: value => /\d/.test(value) })
  }
  if (rules.requireSymbol) {
    requirements.push({
      id: 'symbol',
      label: 'One symbol',
      test: value => /[^A-Za-z0-9]/.test(value),
    })
  }
  if (rules.blockCommonPasswords) {
    requirements.push({
      id: 'uncommon',
      label: 'Not a commonly used password',
      test: value => value.length > 0 && !commonPasswordFragments.some(f => value.toLowerCase().includes(f)),
    })
  }
  return requirements
}

/**
 * Stand-in for the backend breach/common-password check. The real list never
 * ships to the client — this only makes the requirement demonstrable.
 */
const commonPasswordFragments = ['password', 'qwerty', '12345', 'letmein', 'delve123']

export const passwordRequirements = buildPasswordRequirements(authConfig.passwordRules)

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordEvaluation {
  satisfied: string[]
  unsatisfied: string[]
  meetsPolicy: boolean
  level: PasswordStrengthLevel
  label: string
  /** 0–4, used for the strength meter segments. */
  score: number
}

export function evaluatePassword(
  value: string,
  requirements: PasswordRequirement[] = passwordRequirements,
): PasswordEvaluation {
  const satisfied: string[] = []
  const unsatisfied: string[] = []
  requirements.forEach(requirement => {
    if (requirement.test(value)) satisfied.push(requirement.id)
    else unsatisfied.push(requirement.id)
  })

  if (value.length === 0) {
    return { satisfied, unsatisfied, meetsPolicy: false, level: 'empty', label: '', score: 0 }
  }

  const ratio = satisfied.length / requirements.length
  const lengthBonus = value.length >= authConfig.passwordRules.minimumLength + 4 ? 1 : 0
  const raw = Math.round(ratio * 3) + lengthBonus

  const level: PasswordStrengthLevel = raw <= 1 ? 'weak' : raw === 2 ? 'fair' : raw === 3 ? 'good' : 'strong'
  const label = level === 'weak' ? 'Weak' : level === 'fair' ? 'Fair' : level === 'good' ? 'Good' : 'Strong'

  return {
    satisfied,
    unsatisfied,
    meetsPolicy: unsatisfied.length === 0,
    level,
    label,
    score: Math.max(1, Math.min(4, raw)),
  }
}

export function enabledSocialProviders(config: AuthConfiguration = authConfig): SocialProvider[] {
  return config.socialProviders.filter(provider => provider.enabled)
}

export function countryByCode(code: string, config: AuthConfiguration = authConfig): CountryDialCode {
  return config.countries.find(country => country.code === code) ?? config.countries[0]
}

/** Reference travelers can quote to support. Not a session or auth token. */
export function buildSupportReference(seed = 'DLV'): string {
  return `${seed}-8F42-7C19`
}

// ─── Sample account (documentation only) ──────────────────────────────────

export const sampleUser: User = {
  id: 'usr_8f42d1',
  firstName: 'Amara',
  lastName: 'Shipanga',
  displayName: 'Amara S.',
  email: 'traveler@example.com',
  maskedEmail: sampleMaskedEmail,
  emailVerified: true,
  phoneCountryCode: '+264',
  phoneNumber: '811234567',
  maskedPhone: sampleMaskedPhone,
  phoneVerified: false,
  avatarUrl: null,
  homeCity: 'Windhoek',
  accountStatus: 'active',
  authenticationMethods: ['password', 'google'],
  linkedProviders: ['password', 'google'],
  profileCompletionStatus: 'basic',
  preferredTheme: 'system',
  marketingOptIn: false,
  termsAcceptedAt: '2026-02-14T09:12:00Z',
  privacyAcknowledgedAt: '2026-02-14T09:12:00Z',
  createdAt: '2026-02-14T09:12:00Z',
  lastSignInAt: '2026-08-01T06:40:00Z',
}

export default authConfig
