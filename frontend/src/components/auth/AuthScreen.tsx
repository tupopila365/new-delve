import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HOME_HERO_BG } from '../../data/homeDefaults'
import { BrandLogo } from '../BrandLogo'
import './auth-screen.css'

export type AuthScreenMode = 'login' | 'register' | 'other'

type Props = {
  mode?: AuthScreenMode
  /** Preserve `?next=` when switching between sign-in and create account. */
  loginTo?: string
  registerTo?: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  hint?: ReactNode
}

export function AuthScreen({
  mode = 'other',
  loginTo = '/login',
  registerTo = '/register',
  title,
  subtitle,
  children,
  footer,
  hint,
}: Props) {
  const showModeSwitch = mode === 'login' || mode === 'register'

  return (
    <div className={`auth-page${showModeSwitch ? ` auth-page--${mode}` : ''}`}>
      <div className="auth-page__bg" aria-hidden>
        <img className="auth-page__bg-img" src={HOME_HERO_BG} alt="" loading="eager" decoding="async" />
        <div className="auth-page__bg-scrim" />
      </div>

      <header className="auth-page__top">
        <Link to="/" className="auth-page__logo" aria-label="DELVE home">
          <BrandLogo alt="" />
        </Link>
        <Link to="/" className="auth-page__back">
          Back to home
        </Link>
      </header>

      <main className="auth-page__main">
        <div className="auth-page__panel">
          {showModeSwitch ? (
            <nav className="auth-page__modes" aria-label="Account access">
              <Link
                to={loginTo}
                className={`auth-page__mode${mode === 'login' ? ' is-active' : ''}`}
                aria-current={mode === 'login' ? 'page' : undefined}
              >
                Sign in
              </Link>
              <Link
                to={registerTo}
                className={`auth-page__mode${mode === 'register' ? ' is-active' : ''}`}
                aria-current={mode === 'register' ? 'page' : undefined}
              >
                Create account
              </Link>
            </nav>
          ) : null}

          <header className="auth-page__copy">
            <h1 className="auth-page__title">{title}</h1>
            {subtitle ? <p className="auth-page__subtitle">{subtitle}</p> : null}
          </header>

          {children}

          {hint ? <p className="auth-page__hint">{hint}</p> : null}

          {footer ? <div className="auth-page__footer">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
