import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { UserAvatar } from '../UserAvatar'

export type PickedUser = {
  id: number
  username: string
  display_name: string
  avatar?: string | null
}

type PeopleSearchRow = {
  id: number
  username: string
  display_name: string
  avatar?: string | null
}

type CommunityUserPickerProps = {
  selected: PickedUser[]
  onChange: (users: PickedUser[]) => void
  disabled?: boolean
  maxUsers?: number
  placeholder?: string
  label?: string
}

export default function CommunityUserPicker({
  selected,
  onChange,
  disabled = false,
  maxUsers = 20,
  placeholder = 'Name or @username',
  label = 'Invite people',
}: CommunityUserPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PeopleSearchRow[]>([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    const timer = window.setTimeout(() => {
      setSearching(true)
      const params = new URLSearchParams({ q })
      apiFetch<{ results: PeopleSearchRow[] }>(`/api/messaging/people/?${params}`)
        .then((res) => {
          const pickedIds = new Set(selected.map((u) => u.id))
          setResults((res.results || []).filter((row) => !pickedIds.has(row.id)))
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query, selected])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const addUser = useCallback(
    (row: PeopleSearchRow) => {
      if (selected.length >= maxUsers) return
      if (selected.some((u) => u.id === row.id)) return
      onChange([
        ...selected,
        {
          id: row.id,
          username: row.username,
          display_name: row.display_name || row.username,
          avatar: row.avatar ?? null,
        },
      ])
      setQuery('')
      setResults([])
      inputRef.current?.focus()
    },
    [maxUsers, onChange, selected],
  )

  const removeUser = useCallback(
    (id: number) => {
      onChange(selected.filter((u) => u.id !== id))
    },
    [onChange, selected],
  )

  const atMax = selected.length >= maxUsers
  const trimmedQuery = query.trim()
  const showResults = focused && trimmedQuery.length >= 2

  return (
    <div className="cm-invite-picker" ref={wrapRef}>
      <div className="cm-invite-picker__head">
        <span className="cm-invite-picker__label">{label}</span>
        <span className="cm-invite-picker__count">
          {selected.length}/{maxUsers}
        </span>
      </div>

      <div className="cm-invite-picker__panel">
        {selected.length > 0 ? (
          <ul className="cm-invite-picker__selected" aria-label="Invited people">
            {selected.map((user) => (
              <li key={user.id} className="cm-invite-picker__person">
                <div className="cm-invite-picker__avatar-wrap">
                  <UserAvatar
                    src={user.avatar}
                    name={user.display_name}
                    size="lg"
                    className="cm-invite-picker__avatar"
                  />
                  <button
                    type="button"
                    className="cm-invite-picker__remove"
                    onClick={() => removeUser(user.id)}
                    disabled={disabled}
                    aria-label={`Remove @${user.username}`}
                  >
                    <X size={10} strokeWidth={3} aria-hidden />
                  </button>
                </div>
                <span className="cm-invite-picker__person-name">{user.display_name}</span>
              </li>
            ))}
            {!atMax ? (
              <li className="cm-invite-picker__person cm-invite-picker__person--add">
                <button
                  type="button"
                  className="cm-invite-picker__add-slot"
                  onClick={() => inputRef.current?.focus()}
                  disabled={disabled}
                  aria-label="Add another person"
                >
                  <UserPlus size={18} strokeWidth={2.25} aria-hidden />
                </button>
                <span className="cm-invite-picker__person-name">Add</span>
              </li>
            ) : null}
          </ul>
        ) : null}

        <label className={`cm-invite-picker__search${focused ? ' is-focused' : ''}`}>
          <Search size={16} strokeWidth={2.25} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={atMax ? `Maximum ${maxUsers} people` : placeholder}
            disabled={disabled || atMax}
            autoComplete="off"
            enterKeyHint="search"
            aria-expanded={showResults}
          />
          {query ? (
            <button
              type="button"
              className="cm-invite-picker__clear"
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </label>

        {showResults ? (
          <div className="cm-invite-picker__results" role="listbox" aria-label="Search results">
            {searching ? (
              <div className="cm-invite-picker__status">
                <Loader2 size={16} strokeWidth={2.25} className="cm-invite-picker__spinner" aria-hidden />
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="cm-invite-picker__status">No travellers found — try @username</div>
            ) : (
              <ul className="cm-invite-picker__result-list">
                {results.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="cm-invite-picker__result"
                      role="option"
                      onClick={() => addUser(row)}
                      disabled={disabled}
                    >
                      <UserAvatar
                        src={row.avatar}
                        name={row.display_name || row.username}
                        size="md"
                        className="cm-invite-picker__result-avatar"
                      />
                      <span className="cm-invite-picker__result-copy">
                        <strong>{row.display_name || row.username}</strong>
                        <span>@{row.username}</span>
                      </span>
                      <span className="cm-invite-picker__add-btn" aria-hidden>
                        <UserPlus size={14} strokeWidth={2.5} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : !selected.length ? (
          <p className="cm-invite-picker__hint">
            <UserPlus size={14} strokeWidth={2.25} aria-hidden />
            Search to invite travellers to your group
          </p>
        ) : null}
      </div>
    </div>
  )
}
