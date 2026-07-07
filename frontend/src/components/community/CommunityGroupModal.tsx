import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X } from 'lucide-react'
import { ApiError, apiFetch, asArray } from '../../api/client'
import { fetchTagTrending, type TagSummary } from '../../api/tags'
import { useAuth } from '../../auth/AuthContext'
import { ComposerPillInput } from '../ui/ComposerPillInput'
import type { CommunityGroup, CommunityGroupTopic } from '../../utils/communityGroups'
import { COMMUNITY_GROUP_TOPICS, groupsCreatePath } from '../../utils/communityGroups'
import { extractHashtags, MAX_TAGS_PER_POST } from '../../utils/hashtags'
import { CommunityComposeModalShell } from './CommunityComposeModalShell'
import { CommunityComposeTrendingTags } from './CommunityComposeTrendingTags'
import CommunityUserPicker, { type PickedUser } from './CommunityUserPicker'
import './community-compose-modal.css'

const TRENDING_TAG_LIMIT = 8

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (group: CommunityGroup) => void
}

export function CommunityGroupModal({ open, onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState<CommunityGroupTopic>('general')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [invitees, setInvitees] = useState<PickedUser[]>([])
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')

  const trendingQuery = useQuery({
    queryKey: ['tags-trending', 'community', 'groups'],
    queryFn: () => fetchTagTrending('community', TRENDING_TAG_LIMIT),
    enabled: open,
  })
  const trendingTags = useMemo(() => asArray<TagSummary>(trendingQuery.data), [trendingQuery.data])
  const tagCount = useMemo(() => extractHashtags(tags).length, [tags])
  const tooManyTags = tagCount > MAX_TAGS_PER_POST

  const canCreate = name.trim().length >= 2 && description.trim().length >= 8 && !tooManyTags
  const isDirty =
    name.trim().length > 0 ||
    description.trim().length > 0 ||
    topic !== 'general' ||
    visibility !== 'public' ||
    Boolean(coverFile) ||
    invitees.length > 0 ||
    tags.trim().length > 0

  const reset = () => {
    setName('')
    setDescription('')
    setTopic('general')
    setVisibility('public')
    setCoverFile(null)
    setInvitees([])
    setTags('')
    setError('')
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
  }

  const requestClose = () => {
    if (isDirty && !window.confirm('Discard this group?')) return
    reset()
    onClose()
  }

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }, [coverPreview])

  const createMut = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('name', name.trim())
      form.set('description', description.trim())
      form.set('topic', topic)
      form.set('visibility', visibility)
      if (coverFile) form.set('cover_image', coverFile)
      if (invitees.length > 0) {
        form.set('member_usernames', JSON.stringify(invitees.map((u) => u.username)))
      }
      const tagSlugs = extractHashtags(tags)
      if (tagSlugs.length > 0) {
        form.set('tags', tagSlugs.map((slug) => `#${slug}`).join(' '))
      }
      return apiFetch<CommunityGroup>(groupsCreatePath(), {
        method: 'POST',
        body: form,
      })
    },
    onSuccess: async (group) => {
      await qc.invalidateQueries({ queryKey: ['community-groups'] })
      reset()
      onCreated(group)
      onClose()
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not create group.'),
  })

  if (!profile) return null

  return (
    <CommunityComposeModalShell
      open={open}
      title="Create a group"
      titleId="cm-group-modal-title"
      onClose={requestClose}
    >
      <form
        className="cm-compose-modal__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canCreate || createMut.isPending) return
          setError('')
          createMut.mutate()
        }}
      >
        <label className="cm-compose-modal__composer-block">
          <span>Group name</span>
          <ComposerPillInput
            theme="dark"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sossusvlei Self-Drive"
            maxLength={120}
            autoFocus
            required
          />
        </label>

        <label className="cm-compose-modal__composer-block">
          <span>Description</span>
          <textarea
            className="cm-compose-modal__textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group about? Who should join?"
            required
          />
        </label>

        <div className="cm-compose-modal__composer-block">
          <span>Topic</span>
          <div className="cm-compose-modal__pill-row cm-compose-modal__pill-row--wrap" role="group" aria-label="Group topic">
            {COMMUNITY_GROUP_TOPICS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={topic === row.id ? 'is-active' : ''}
                aria-pressed={topic === row.id}
                onClick={() => setTopic(row.id)}
              >
                {row.label}
              </button>
            ))}
          </div>
        </div>

        <label className="cm-compose-modal__composer-block">
          <span>Tags</span>
          <ComposerPillInput
            theme="dark"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. #4x4 #camping #sossusvlei"
          />
          <p className="cm-compose-modal__hint">
            Up to {MAX_TAGS_PER_POST} hashtags · helps people discover your group in search.
          </p>
        </label>

        <CommunityComposeTrendingTags
          tags={trendingTags}
          text={tags}
          onChange={setTags}
          onError={setError}
        />

        <div className="cm-compose-modal__composer-block">
          <span>Visibility</span>
          <div className="cm-compose-modal__pill-row" role="group" aria-label="Group visibility">
            <button
              type="button"
              className={visibility === 'public' ? 'is-active' : ''}
              aria-pressed={visibility === 'public'}
              onClick={() => setVisibility('public')}
            >
              Public
            </button>
            <button
              type="button"
              className={visibility === 'private' ? 'is-active' : ''}
              aria-pressed={visibility === 'private'}
              onClick={() => setVisibility('private')}
            >
              Private
            </button>
          </div>
          <p className="cm-compose-modal__hint">
            {visibility === 'public' ? 'Anyone can join this group.' : 'You approve who can join.'}
          </p>
        </div>

        <CommunityUserPicker
          selected={invitees}
          onChange={setInvitees}
          disabled={createMut.isPending}
          label="Invite people (optional)"
        />

        <div className="cm-compose-modal__composer-block">
          <span>Cover image (optional)</span>
          <div className="cm-compose-modal__cover">
            <label className="cm-compose-modal__cover-btn">
              <ImagePlus size={16} strokeWidth={2.25} aria-hidden />
              {coverFile ? 'Change photo' : 'Add photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (coverPreview) URL.revokeObjectURL(coverPreview)
                  setCoverFile(file)
                  setCoverPreview(URL.createObjectURL(file))
                  e.target.value = ''
                }}
              />
            </label>
            {coverPreview ? (
              <div className="cm-compose-modal__cover-preview">
                <img src={coverPreview} alt="Group cover preview" />
                <button
                  type="button"
                  className="cm-compose-modal__cover-remove"
                  aria-label="Remove cover image"
                  onClick={() => {
                    if (coverPreview) URL.revokeObjectURL(coverPreview)
                    setCoverFile(null)
                    setCoverPreview(null)
                  }}
                >
                  <X size={14} strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="cm-compose-modal__error">{error}</p> : null}
        {tooManyTags ? (
          <p className="cm-compose-modal__error">Use up to {MAX_TAGS_PER_POST} hashtags per group.</p>
        ) : null}

        <button type="submit" className="cm-compose-modal__submit" disabled={!canCreate || createMut.isPending}>
          {createMut.isPending ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </CommunityComposeModalShell>
  )
}
