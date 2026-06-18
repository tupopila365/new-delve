import { BadgeCheck, Languages, ShieldCheck } from 'lucide-react'
import { ListingSection } from '../listing/ListingSection'
import type { LanguageRow } from '../../utils/guideListing'
import './guide-credentials-card.css'

type Props = {
  yearsGuiding?: number | null
  licensed?: boolean
  certifications: string[]
  languagesDetail: LanguageRow[]
  fallbackLanguages: string[]
  className?: string
}

export function GuideCredentialsCard({
  yearsGuiding,
  licensed,
  certifications,
  languagesDetail,
  fallbackLanguages,
  className = '',
}: Props) {
  const langs =
    languagesDetail.length > 0
      ? languagesDetail
      : fallbackLanguages.map((language) => ({ language, level: '' }))

  const hasBody =
    (yearsGuiding != null && yearsGuiding > 0) ||
    licensed ||
    certifications.length > 0 ||
    langs.length > 0

  if (!hasBody) return null

  return (
    <ListingSection title="Credentials" className={`guide-cred ${className}`.trim()}>
      <div className="guide-cred__panel">
        {(yearsGuiding != null && yearsGuiding > 0) || licensed ? (
          <div className="guide-cred__highlights">
            {yearsGuiding != null && yearsGuiding > 0 ? (
              <div className="guide-cred__highlight">
                <strong>{yearsGuiding}+</strong>
                <span>years guiding</span>
              </div>
            ) : null}
            {licensed ? (
              <div className="guide-cred__highlight guide-cred__highlight--licensed">
                <ShieldCheck size={18} strokeWidth={2.25} aria-hidden />
                <span>Licensed guide</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {certifications.length > 0 ? (
          <ul className="guide-cred__certs">
            {certifications.map((cert) => (
              <li key={cert}>
                <BadgeCheck size={14} strokeWidth={2.25} aria-hidden />
                {cert}
              </li>
            ))}
          </ul>
        ) : null}

        {langs.length > 0 ? (
          <div className="guide-cred__langs">
            <p className="guide-cred__langs-label">
              <Languages size={14} strokeWidth={2.25} aria-hidden />
              Languages
            </p>
            <div className="guide-cred__lang-pills">
              {langs.map((row) => (
                <span key={row.language} className="guide-cred__pill">
                  {row.language}
                  {row.level ? <em>{row.level}</em> : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </ListingSection>
  )
}
