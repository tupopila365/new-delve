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
  const missing = requirements.filter((r) => !r.met)

  return (
    <section className="fv-publish" aria-labelledby="fv-publish-title">
      <div className="fv-publish__head">
        <div>
          <h2 id="fv-publish-title">Publishing</h2>
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
                className="btn btn-ghost"
                disabled={isPending}
                onClick={onUnpublish}
              >
                {isPending ? 'Updating…' : 'Unpublish'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ready || isPending}
                onClick={onPublish}
                title={!ready ? 'Complete required items to publish' : undefined}
              >
                {isPending ? 'Publishing…' : 'Publish venue'}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {!venue.is_active ? (
        <ul className="fv-publish__checklist">
          {requirements.map((req) => (
            <li key={req.id} className={req.met ? 'fv-publish__check--met' : 'fv-publish__check--missing'}>
              <span className="fv-publish__check-icon" aria-hidden>
                {req.met ? '✓' : '○'}
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
      ) : null}

      {!venue.is_active && missing.length > 0 && canManage ? (
        <p className="fv-publish__hint">
          {missing.length} required item{missing.length === 1 ? '' : 's'} before you can publish.
          Section completeness is separate — fill optional details anytime.
        </p>
      ) : null}
    </section>
  )
}
