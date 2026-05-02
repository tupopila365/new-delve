import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Conv = {
  id: number
  participants_detail: { id: number; username: string; display_name: string }[]
  last_message: { body: string; sender_username: string } | null
  updated_at: string
}

export function Messages() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [uid, setUid] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversations'],
    enabled: !!profile,
    queryFn: () => apiFetch<Conv[]>('/api/messaging/conversations/'),
  })

  const conversations = Array.isArray(data) ? data : []

  const startMut = useMutation({
    mutationFn: () => apiFetch<Conv>('/api/messaging/start/', { method: 'POST', body: JSON.stringify({ user_id: Number(uid) }) }),
    onSuccess: () => {
      setUid('')
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  if (!profile) {
    return (
      <p>
        <Link to="/login">Sign in</Link> to see messages.
      </p>
    )
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.65rem' }}>Messages</h1>
      <div className="card" style={{ padding: '0.85rem', marginBottom: '1rem' }}>
        <p style={{ fontWeight: 700, marginTop: 0 }}>Start chat</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="User ID (from admin)" value={uid} onChange={(e) => setUid(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={!uid} onClick={() => startMut.mutate()}>
            Go
          </button>
        </div>
      </div>
      {isLoading && <p style={{ color: 'var(--text-secondary)' }}>Loading conversations…</p>}
      {isError && <p style={{ color: 'var(--danger, crimson)' }}>Could not load messages.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {conversations.map((c) => {
          const other = c.participants_detail.find((p) => p.username !== profile.username)
          const label = other?.display_name || other?.username || 'Chat'
          const previewBody = c.last_message?.body?.slice(0, 60) ?? ''
          return (
            <Link key={c.id} to={`/messages/${c.id}`} className="card" style={{ padding: '0.85rem', textDecoration: 'none', color: 'inherit' }}>
              <strong>{label}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {c.last_message
                  ? `${c.last_message.sender_username}: ${previewBody}${previewBody.length >= 60 ? '…' : ''}`
                  : 'No messages yet'}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
