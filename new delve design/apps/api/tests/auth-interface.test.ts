import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), '../..')

describe('auth interface contracts', () => {
  it('keeps Google and Apple controls removed from traveler auth surfaces', () => {
    const files = [
      'src/pages/auth/SignInScreen.tsx',
      'src/pages/auth/SignUpScreen.tsx',
      'src/pages/auth/ForgotPasswordFlow.tsx',
      'src/components/auth/index.ts',
    ]
    for (const file of files) {
      const source = readFileSync(join(root, file), 'utf8')
      expect(source).not.toMatch(/Continue with Google|Continue with Apple|SocialAuthButton|SocialAuthGroup/)
    }
  })

  it('password fields declare password-manager friendly autocomplete', () => {
    const signIn = readFileSync(join(root, 'src/pages/auth/SignInScreen.tsx'), 'utf8')
    expect(signIn).toContain('autoComplete="username"')
    expect(signIn).toContain('autoComplete="current-password"')

    const signUp = readFileSync(join(root, 'src/pages/auth/SignUpScreen.tsx'), 'utf8')
    expect(signUp).toContain('autoComplete="new-password"')
    expect(signUp).toContain('autoCapitalize="none"')

    const passwordField = readFileSync(join(root, 'src/components/auth/PasswordField.tsx'), 'utf8')
    expect(passwordField).toContain('Hide password')
    expect(passwordField).toContain('Show password')
    expect(passwordField).toContain('Caps Lock')
    expect(passwordField).toContain('getModifierState')
  })

  it('auth forms disable duplicate submit via busy/loading patterns', () => {
    const signIn = readFileSync(join(root, 'src/pages/auth/SignInScreen.tsx'), 'utf8')
    expect(signIn).toContain('busy={submitting}')
    expect(signIn).toContain('loading={submitting}')

    const forgot = readFileSync(join(root, 'src/pages/auth/ForgotPasswordFlow.tsx'), 'utf8')
    expect(forgot).toContain('busy={sending}')
    expect(forgot).toContain('if (sending) return')
  })

  it('associates field errors for accessibility', () => {
    const textField = readFileSync(join(root, 'src/components/auth/TextField.tsx'), 'utf8')
    expect(textField).toContain('aria-invalid')
    expect(textField).toContain('aria-describedby')
  })

  it('includes session and reset password surfaces', () => {
    const settings = readFileSync(join(root, 'src/pages/AccountSettingsPage.tsx'), 'utf8')
    expect(settings).toContain('Sessions and devices')
    expect(settings).toContain('ConfirmationDialog')
    expect(settings).toContain('Sign out everywhere')

    const reset = readFileSync(join(root, 'src/pages/auth/ResetPasswordPage.tsx'), 'utf8')
    expect(reset).toContain('Password updated')
    expect(reset).toContain('Reset link expired')

    const modal = readFileSync(join(root, 'src/components/auth/ModalOverlay.tsx'), 'utf8')
    expect(modal).toContain('previousFocusRef')
  })
})
