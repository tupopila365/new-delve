import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ROOM_BADGE_OPTIONS,
  isPresetRoomBadge,
  type StayRoomForm,
} from './stayListingTypes'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'
import { StayPhotoEditor } from './StayPhotoEditor'

type Props = {
  room: StayRoomForm
  onChange: (room: StayRoomForm) => void
  fallbackNightly?: string
}

/** Single-room editor used on dedicated room pages. */
export function StayRoomEditor({ room, onChange, fallbackNightly = '' }: Props) {
  const { currency } = useDisplayMoney()
  const [badgeDraft, setBadgeDraft] = useState('')

  function patch(partial: Partial<StayRoomForm>) {
    onChange({ ...room, ...partial })
  }

  function toggleBadge(label: string) {
    const exists = room.badges.some((b) => b.toLowerCase() === label.toLowerCase())
    if (exists) {
      patch({ badges: room.badges.filter((b) => b.toLowerCase() !== label.toLowerCase()) })
      return
    }
    if (room.badges.length >= 8) return
    patch({ badges: [...room.badges, label] })
  }

  function addCustomBadge() {
    const draft = badgeDraft.trim().replace(/\s+/g, ' ')
    if (!draft || room.badges.length >= 8) return
    if (room.badges.some((b) => b.toLowerCase() === draft.toLowerCase())) {
      setBadgeDraft('')
      return
    }
    patch({ badges: [...room.badges, draft] })
    setBadgeDraft('')
  }

  return (
    <div className="stay-form__section">
      <label className="stay-form__field">
        <span>Room name</span>
        <input
          value={room.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Deluxe double"
        />
      </label>
      <label className="stay-form__field">
        <span>Description</span>
        <textarea
          rows={3}
          value={room.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What makes this room special?"
        />
      </label>
      <div className="stay-form__row">
        <label className="stay-form__field">
          <span>Guests</span>
          <input
            type="number"
            min={1}
            value={room.max_guests}
            onChange={(e) => patch({ max_guests: Number(e.target.value) })}
          />
        </label>
        <label className="stay-form__field">
          <span>Bedrooms</span>
          <input
            type="number"
            min={0}
            value={room.bedrooms}
            onChange={(e) => patch({ bedrooms: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="stay-form__field">
        <span>Bed setup</span>
        <input
          value={room.bed_summary}
          onChange={(e) => patch({ bed_summary: e.target.value })}
          placeholder="1 king bed"
        />
      </label>

      <div className="stay-form__list-block">
        <span className="stay-form__list-label">Room price ({currency})</span>
        <div className="stay-form__row">
          <label className="stay-form__field">
            <span>Price guests pay / night</span>
            <input
              value={room.price_per_night}
              onChange={(e) => patch({ price_per_night: e.target.value })}
              placeholder={fallbackNightly || '850'}
              inputMode="decimal"
            />
          </label>
          <label className="stay-form__field">
            <span>Old price (optional)</span>
            <input
              value={room.compare_at_price}
              onChange={(e) => patch({ compare_at_price: e.target.value })}
              placeholder="Only if discounted"
              inputMode="decimal"
            />
          </label>
        </div>
        <p className="stay-form__hint">
          Leave old price empty for a normal rate. If you set a higher old price, guests see it crossed
          out next to the price they pay.
        </p>
      </div>

      <div className="stay-form__list-block">
        <span className="stay-form__list-label">Sale / special badges</span>
        <p className="stay-form__hint">Pick common badges, or add your own label.</p>
        <div className="stay-form__chips">
          {ROOM_BADGE_OPTIONS.map((label) => {
            const on = room.badges.some((b) => b.toLowerCase() === label.toLowerCase())
            return (
              <button
                key={label}
                type="button"
                className={`stay-form__chip${on ? ' stay-form__chip--on' : ''}`}
                onClick={() => toggleBadge(label)}
                disabled={!on && room.badges.length >= 8}
              >
                {label}
              </button>
            )
          })}
          {room.badges
            .filter((b) => !isPresetRoomBadge(b))
            .map((badge) => (
              <button
                key={badge}
                type="button"
                className="stay-form__chip stay-form__chip--on stay-form__chip--custom"
                onClick={() =>
                  patch({
                    badges: room.badges.filter((b) => b.toLowerCase() !== badge.toLowerCase()),
                  })
                }
                aria-label={`Remove badge: ${badge}`}
                title="Click to remove"
              >
                {badge}
                <span aria-hidden>×</span>
              </button>
            ))}
        </div>
        <div className="stay-form__amenity-add">
          <label className="stay-form__field">
            <span>Add your own</span>
            <input
              value={badgeDraft}
              onChange={(e) => setBadgeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomBadge()
                }
              }}
              placeholder="e.g. Sea view, Weekend special"
              maxLength={40}
              disabled={room.badges.length >= 8}
            />
          </label>
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--ghost stay-form__amenity-add-btn"
            disabled={!badgeDraft.trim() || room.badges.length >= 8}
            onClick={addCustomBadge}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add
          </button>
        </div>
      </div>

      <label className="stay-form__check">
        <input
          type="checkbox"
          checked={room.featured}
          onChange={(e) => patch({ featured: e.target.checked })}
        />
        Feature this room (highlight it on the detail page)
      </label>

      <div className="stay-form__list-block">
        <span className="stay-form__list-label">Room photos & video</span>
        <StayPhotoEditor
          values={{
            cover_image_url: room.image,
            cover_image_file: room.image_file ?? null,
            gallery_urls: room.images,
            gallery_files: room.gallery_files ?? [],
          }}
          onChange={(partial) => {
            patch({
              image: partial.cover_image_url !== undefined ? partial.cover_image_url : room.image,
              image_file:
                partial.cover_image_file !== undefined ? partial.cover_image_file : room.image_file,
              images: partial.gallery_urls !== undefined ? partial.gallery_urls : room.images,
              gallery_files:
                partial.gallery_files !== undefined ? partial.gallery_files : room.gallery_files,
            })
          }}
          hint="Tap Add to upload. Cover can be a photo or short video of this room."
        />
      </div>
    </div>
  )
}
