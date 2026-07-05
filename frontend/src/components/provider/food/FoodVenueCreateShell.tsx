import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Store } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { friendlyApiMessage } from '../../../utils/friendlyError'
import type { ProviderFoodVenue } from './foodVenueTypes'
import '../ui/provider-ui.css'
import './workspace/food-venue-workspace.css'

type Props = {
  onClose: () => void
  onCreated: (venue: ProviderFoodVenue) => void
}

export function FoodVenueCreateShell({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<ProviderFoodVenue>('/api/food/provider-venues/', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), is_active: false }),
      }),
    onSuccess: (venue) => onCreated(venue),
    onError: (err) => setError(friendlyApiMessage(err, 'Could not create venue.')),
  })

  return (
    <div className="fv-create-shell" role="dialog" aria-modal="true" aria-labelledby="fv-create-title">
      <button type="button" className="fv-create-shell__backdrop" aria-label="Close" onClick={onClose} />
      <div className="fv-create-shell__panel">
        <div className="fv-create-shell__title-row">
          <span className="fv-create-shell__icon" aria-hidden>
            <Store size={20} strokeWidth={2.25} />
          </span>
          <h2 id="fv-create-title">Add food venue</h2>
        </div>
        <p>Start with a name — you can fill location, hours, and photos in any order afterward.</p>
        {error ? (
          <p className="fv-workspace__error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="fv-field">
          <span>Venue name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Oryx Grill House"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) createMut.mutate()
            }}
          />
        </label>
        <div className="fv-create-shell__actions">
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={!name.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? 'Creating…' : 'Create & continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
