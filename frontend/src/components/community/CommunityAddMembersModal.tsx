import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../api/client'
import { groupAddMembersPath } from '../../utils/communityGroups'
import { CommunityComposeModalShell } from './CommunityComposeModalShell'
import CommunityUserPicker, { type PickedUser } from './CommunityUserPicker'
import './community-compose-modal.css'

type Props = {
  open: boolean
  slug: string
  groupName: string
  onClose: () => void
}

export function CommunityAddMembersModal({ open, slug, groupName, onClose }: Props) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<PickedUser[]>([])
  const [error, setError] = useState('')

  const reset = () => {
    setSelected([])
    setError('')
  }

  const requestClose = () => {
    if (selected.length > 0 && !window.confirm('Discard selected people?')) return
    reset()
    onClose()
  }

  const addMut = useMutation({
    mutationFn: async () =>
      apiFetch<{ added: string[]; skipped: string[] }>(groupAddMembersPath(slug), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: selected.map((u) => u.username) }),
      }),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['community-group', slug] })
      await qc.invalidateQueries({ queryKey: ['community-group-members', slug] })
      await qc.invalidateQueries({ queryKey: ['community-groups'] })
      reset()
      onClose()
      if (result.skipped?.length) {
        window.alert(`Added ${result.added.length} member(s). Skipped: ${result.skipped.join(', ')}`)
      }
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not add members.'),
  })

  return (
    <CommunityComposeModalShell
      open={open}
      title={`Add to ${groupName}`}
      titleId="cm-add-members-title"
      onClose={requestClose}
    >
      <form
        className="cm-compose-modal__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (selected.length === 0 || addMut.isPending) return
          setError('')
          addMut.mutate()
        }}
      >
        <p className="cm-compose-modal__note">
          Search for travellers by username and add them directly to this group.
        </p>

        <CommunityUserPicker selected={selected} onChange={setSelected} disabled={addMut.isPending} />

        {error ? <p className="cm-compose-modal__error">{error}</p> : null}

        <button
          type="submit"
          className="cm-compose-modal__submit"
          disabled={selected.length === 0 || addMut.isPending}
        >
          {addMut.isPending ? 'Adding…' : `Add ${selected.length || ''} member${selected.length === 1 ? '' : 's'}`.trim()}
        </button>
      </form>
    </CommunityComposeModalShell>
  )
}
