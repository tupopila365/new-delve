import { Link } from 'react-router-dom'
import { BadgeCheck, Clock, Compass, Star } from 'lucide-react'
import type { ProviderGuideProfile } from './guideProfileTypes'
import { profileCompleteness } from './guideProfileTypes'

type Props = {
  guide: ProviderGuideProfile
  canEdit?: boolean
  onEdit: () => void
  onManageHighlights?: () => void
}

export function GuideProfileSummaryCard({ guide, canEdit, onEdit, onManageHighlights }: Props) {
  const { percent, missing } = profileCompleteness(guide)
  const packageCount = guide.tour_packages?.length ?? 0
  const highlightCount = guide.guide_stories?.length ?? 0
  const highlightsLabel =
    highlightCount > 0
      ? `${highlightCount} highlight ring${highlightCount === 1 ? '' : 's'}`
      : 'No custom highlights yet'

  return (
    <article className="prov-ui__card guide-profile-card">
      <div className="guide-profile-card__top">
        <div className="guide-profile-card__photo">
          {guide.photo ? (
            <img src={guide.photo} alt="" />
          ) : (
            <span className="guide-profile-card__photo-fallback" aria-hidden>
              <Compass size={24} strokeWidth={2} />
            </span>
          )}
          {!guide.is_active ? <span className="guide-card__badge guide-card__badge--hidden">Hidden</span> : null}
          {percent < 100 ? <span className="guide-card__badge guide-card__badge--draft">{percent}% complete</span> : null}
        </div>

        <div className="guide-profile-card__info">
          <div className="guide-profile-card__head">
            <div>
              <p className="guide-profile-card__name">{guide.display_name ?? guide.username}</p>
              <h3 className="guide-profile-card__headline">{guide.headline}</h3>
            </div>
            <span className={`guide-card__status${guide.is_active !== false ? ' guide-card__status--live' : ''}`}>
              {guide.is_active !== false ? 'Live' : 'Hidden'}
            </span>
          </div>

          {guide.bio ? <p className="guide-profile-card__bio">{guide.bio}</p> : null}

          <div className="guide-profile-card__stats">
            <span>
              <Star size={14} aria-hidden /> {guide.rating_avg} ({guide.rating_count})
            </span>
            {guide.years_guiding ? <span>{guide.years_guiding} yrs guiding</span> : null}
            {guide.hourly_rate ? <span>N${guide.hourly_rate}/hr</span> : null}
            {guide.response_hours_typical ? (
              <span>
                <Clock size={14} aria-hidden /> ~{guide.response_hours_typical}h response
              </span>
            ) : null}
          </div>

          <div className="guide-profile-card__chips">
            {(guide.specialities ?? []).map((s) => (
              <span key={s}>{s}</span>
            ))}
            {(guide.languages ?? []).map((l) => (
              <span key={l}>{l}</span>
            ))}
            {guide.licensed_guide ? (
              <span className="guide-profile-card__chip--accent">
                <BadgeCheck size={12} aria-hidden /> Licensed
              </span>
            ) : null}
            {packageCount > 0 ? (
              <span>
                {packageCount} package{packageCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {missing.length > 0 ? (
            <p className="guide-card__missing">
              Still needed: {missing.slice(0, 4).join(', ')}
              {missing.length > 4 ? ` +${missing.length - 4} more` : ''}
            </p>
          ) : null}

          <p className="guide-profile-card__bio" style={{ marginTop: 8, opacity: 0.85 }}>
            Highlights: {highlightsLabel}
          </p>
        </div>
      </div>

      <div className="guide-profile-card__actions">
        <Link to={`/guides/${guide.id}`} className="prov-ui__btn prov-ui__btn--ghost">
          View public page
        </Link>
        {canEdit && onManageHighlights ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onManageHighlights}>
            {highlightCount > 0 ? 'Manage highlights' : 'Add highlights'}
          </button>
        ) : null}
        {canEdit ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={onEdit}>
            Edit profile
          </button>
        ) : null}
      </div>
    </article>
  )
}
