import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HOME_HERO_BG } from '../../data/homeDefaults'
import './auth-screen.css'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  footer: ReactNode
  hint?: ReactNode
}

export function AuthScreen({ title, subtitle, children, footer, hint }: Props) {
  return (
    <div className="auth-page">
      <div className="auth-page__bg" aria-hidden>
        <img className="auth-page__bg-img" src={HOME_HERO_BG} alt="" loading="eager" decoding="async" />
        <div className="auth-page__bg-scrim" />
      </div>

      <header className="auth-page__top">
        <Link to="/" className="auth-page__logo">
          DELVE
        </Link>
      </header>

      <main className="auth-page__main">
        <h1 className="auth-page__title">{title}</h1>
        {subtitle ? <p className="auth-page__subtitle">{subtitle}</p> : null}
        {children}
        {hint ? <p className="auth-page__hint">{hint}</p> : null}
      </main>

      <footer className="auth-page__footer">{footer}</footer>
    </div>
  )
}
