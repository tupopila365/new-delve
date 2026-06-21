import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, UserRound, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../api/client'
import { MessagesEmptyState } from './MessagesEmptyState'
import type { MessagingContext } from './messageProviderUtils'
import { messageThreadPath } from './messageProviderUtils'
import './NewMessageSheet.css'

export type MessagePerson = {
  id: number
  username: string
  display_name: string
  avatar?: string | null
  city?: string
  region?: string
}

type Conv = {
  id: number
}

type Props = {
  open: boolean
  onClose: () => void
  recentPeople?: MessagePerson[]
  context?: MessagingContext
}

const COMPOSE_COPY = {
  user: { title: 'New message', placeholder: 'Search name or username', sectionSuggested: 'Suggested', sectionResults: 'Results' },
  provider: { title: 'Message a guest', placeholder: 'Search guest name or username', sectionSuggested: 'Recent guests', sectionResults: 'Guests' },
} as const

function personLabel(person: MessagePerson): string {
  return person.display_name?.trim() || person.username
}

function personInitial(person: MessagePerson): string {
  return personLabel(person).charAt(0).toUpperCase() || 'D'
}

function personMeta(person: MessagePerson): string {
  const place = [person.city, person.region].filter(Boolean).join(', ')
  return place ? `@${person.username} · ${place}` : `@${person.username}`
}

export function NewMessageSheet({ open, onClose, recentPeople = [], context = 'user' }: Props) {
  const composeCopy = COMPOSE_COPY[context]
  const navigate = useNavigate()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [startingId, setStartingId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [open, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
      setStartingId(null)
      return
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['message-people', debouncedQuery],
    enabled: open,
    queryFn: () =>
      apiFetch<{ results: MessagePerson[] }>(
        `/api/messaging/people/${debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ''}`,
      ),
    staleTime: 20_000,
  })

  const startMut = useMutation({
    mutationFn: (userId: number) =>
      apiFetch<Conv>('/api/messaging/start/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    onSuccess: (conversation) => {
      void qc.invalidateQueries({ queryKey: ['conversations'] })
      onClose()
      navigate(messageThreadPath(conversation.id, context))
    },
    onSettled: () => setStartingId(null),
  })

  const searchResults = data?.results ?? []

  const suggested = useMemo(() => {
    if (debouncedQuery) return []
    const seen = new Set<string>()
    const merged: MessagePerson[] = []
    for (const person of [...recentPeople, ...searchResults]) {
      if (seen.has(person.username)) continue
      seen.add(person.username)
      merged.push(person)
    }
    return merged.slice(0, 10)
  }, [debouncedQuery, recentPeople, searchResults])

  const list = debouncedQuery ? searchResults : suggested
  const sectionLabel = debouncedQuery ? composeCopy.sectionResults : composeCopy.sectionSuggested

  function onPick(person: MessagePerson) {
    if (startMut.isPending) return
    setStartingId(person.id)
    startMut.mutate(person.id)
  }

  if (!open) return null

  return (
    <div
      className={`msg-compose-sheet${context === 'provider' ? ' msg-compose-sheet--provider' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={composeCopy.title}
    >
      <button type="button" className="msg-compose-sheet__backdrop" onClick={onClose} aria-label="Close" />

      <div className="msg-compose-sheet__panel">
        <header className="msg-compose-sheet__head">
          <button type="button" className="msg-compose-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2.25} aria-hidden />
          </button>
          <h2>{composeCopy.title}</h2>
        </header>

        <label className="msg-compose-sheet__search">
          <span>To:</span>
          <Search size={16} strokeWidth={2.25} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={composeCopy.placeholder}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query ? (
            <button type="button" className="msg-compose-sheet__clear" onClick={() => setQuery('')} aria-label="Clear">
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </label>

        <div className="msg-compose-sheet__body">
          {isLoading ? (
            <div className="msg-compose-sheet__loading" aria-label="Loading people">
              {[1, 2, 3, 4, 5].map((item) => (
                <span key={item} />
              ))}
            </div>
          ) : null}

          {!isLoading && isError ? (
            <MessagesEmptyState
              icon={<UserRound size={22} strokeWidth={1.75} />}
              title="Couldn't load people"
              subtitle="Check your connection and try again."
            />
          ) : null}

          {!isLoading && !isError && list.length === 0 ? (
            <MessagesEmptyState
              icon={<Search size={22} strokeWidth={1.75} />}
              title={debouncedQuery ? 'No people found' : 'No suggestions yet'}
              subtitle={
                debouncedQuery
                  ? 'Try another name or username.'
                  : 'Message someone from their profile to see them here.'
              }
            />
          ) : null}

          {!isLoading && !isError && list.length > 0 ? (
            <>
              <p className="msg-compose-sheet__section">{sectionLabel}</p>
              <ul className="msg-compose-sheet__list">
                {list.map((person) => {
                  const avatar = mediaUrl(person.avatar ?? null)
                  const busy = startingId === person.id && startMut.isPending
                  return (
                    <li key={person.username}>
                      <button
                        type="button"
                        className="msg-compose-sheet__row"
                        onClick={() => onPick(person)}
                        disabled={startMut.isPending}
                      >
                        <span className="msg-compose-sheet__avatar" aria-hidden>
                          {avatar ? <img src={avatar} alt="" /> : personInitial(person)}
                        </span>
                        <span className="msg-compose-sheet__copy">
                          <strong>{personLabel(person)}</strong>
                          <span>{personMeta(person)}</span>
                        </span>
                        {busy ? (
                          <Loader2 size={16} strokeWidth={2.25} className="msg-compose-sheet__spinner" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}

          {startMut.isError ? (
            <p className="msg-compose-sheet__error" role="alert">
              Could not start this chat. Try again.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
