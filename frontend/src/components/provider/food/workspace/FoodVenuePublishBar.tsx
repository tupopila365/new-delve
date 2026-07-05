import { Check, Circle } from 'lucide-react'
import {
  canPublish,
  publishRequirements,
  type FoodVenueModuleId,
  type ProviderFoodVenueRecord,
} from '../foodVenueModules'

type Props = {
  venue: ProviderFoodVenueRecord
  canManage: boolean
  isPending: boolean
  onPublish: () => void
  onUnpublish: () => void
  onJumpToModule: (module: FoodVenueModuleId) => void
}

export function FoodVenuePublishBar({
  venue,
  canManage,
  isPending,
  onPublish,
  onUnpublish,
  onJumpToModule,
}: Props) {
  const requirements = publishRequirements(venue)
  const ready = canPublish(venue)
  const metCount = requirements.filter((r) => r.met).length
  const progressPct = Math.round((metCount / requirements.length) * 100)

  return (
    <section className="fv-publish" aria-labelledby="fv-publish-title">
      <div className="fv-publish__head">
        <div>
          <div className="fv-publish__title-row">
            <h2 id="fv-publish-title">Publishing</h2>
            {venue.is_active ? (
              <span className="prov-ui__pill prov-ui__pill--ok">Live on DELVE</span>
            ) : (
              <span className="prov-ui__pill prov-ui__pill--warn">Not published</span>
            )}
          </div>
          <p>
            {venue.is_active
              ? 'Your venue is visible to travellers on DELVE.'
              : 'Complete the essentials below, then publish when you are ready.'}
          </p>
        </div>
        {canManage ? (
          <div className="fv-publish__actions">
            {venue.is_active ? (
              <button
                type="button"
                className="prov-ui__btn prov-ui__btn--ghost"
                disabled={isPending}
                onClick={onUnpublish}
              >
                {isPending ? 'Updating…' : 'Unpublish'}
              </button>
            ) : (
              <div className="fv-publish__publish-wrap">
                <button
                  type="button"
                  className="prov-ui__btn prov-ui__btn--primary"
                  disabled={!ready || isPending}
                  onClick={onPublish}
                  aria-describedby={!ready ? 'fv-publish-blocked' : undefined}
                >
                  {isPending ? 'Publishing…' : 'Publish venue'}
                </button>
                {!ready && !isPending ? (
                  <p id="fv-publish-blocked" className="fv-publish__blocked">
                    Finish {requirements.length - metCount} required item
                    {requirements.length - metCount === 1 ? '' : 's'} below
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {!venue.is_active ? (
        <>
          <div className="fv-publish__progress" aria-hidden>
            <div className="fv-publish__progress-track">
              <div className="fv-publish__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="fv-publish__progress-label">
              {metCount} of {requirements.length} essentials
            </span>
          </div>
          <ul className="fv-publish__checklist">
            {requirements.map((req) => (
              <li key={req.id} className={req.met ? 'fv-publish__check--met' : 'fv-publish__check--missing'}>
                <span className="fv-publish__check-icon" aria-hidden>
                  {req.met ? (
                    <Check size={16} strokeWidth={2.5} />
                  ) : (
                    <Circle size={16} strokeWidth={2} />
                  )}
                </span>
                <span>{req.label}</span>
                {!req.met && canManage ? (
                  <button
                    type="button"
                    className="fv-publish__jump"
                    onClick={() => onJumpToModule(req.module)}
                  >
                    Add
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
