export type LanguageLevel = { language: string; level: string }

type Props = {
  yearsGuiding?: number | null
  licensed?: boolean
  certifications: string[]
  languagesDetail: LanguageLevel[]
  fallbackLanguages: string[]
  hideTitle?: boolean
}

export function GuideCredentials({
  yearsGuiding,
  licensed,
  certifications,
  languagesDetail,
  fallbackLanguages,
  hideTitle = false,
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

  const Wrapper = hideTitle ? 'div' : 'section'

  return (
    <Wrapper className="gd-detail__credentials card">
      {hideTitle ? null : <h2 className="gd-detail__section-label">Experience &amp; credentials</h2>}
      <ul className="gd-detail__cred-list">
        {yearsGuiding != null && yearsGuiding > 0 ? (
          <li>
            <strong>{yearsGuiding}+</strong> years guiding
          </li>
        ) : null}
        {licensed ? <li>Licensed / certified guide</li> : null}
        {certifications.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {langs.length > 0 ? (
        <div className="gd-detail__lang-levels">
          <span className="gd-detail__lang-levels-label">Languages</span>
          <ul className="gd-detail__lang-level-rows">
            {langs.map((row) => (
              <li key={row.language}>
                <span className="gd-detail__lang-name">{row.language}</span>
                {row.level ? (
                  <span className="gd-detail__lang-level">{row.level}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Wrapper>
  )
}
