import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Msg = { id: number; sender_username: string; body: string; created_at: string }

export function MessageThread() {
  const { id } = useParams()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages } = useQuery({
    queryKey: ['msgs', id],
    enabled: !!profile && !!id,
    queryFn: () => apiFetch<Msg[]>(`/api/messaging/conversations/${id}/messages/`),
    refetchInterval: 8000,
  })

  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/messaging/conversations/${id}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setBody('')
      void qc.invalidateQueries({ queryKey: ['msgs', id] })
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!profile) {
    return (
      <p>
        <Link to="/login">Sign in</Link>
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8rem)' }}>
      <Link to="/messages" style={{ marginBottom: 8 }}>
        ← Inbox
      </Link>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages?.map((m) => (
          <div
            key={m.id}
            className="card"
            style={{
              padding: '0.65rem 0.85rem',
              alignSelf: m.sender_username === profile.username ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.sender_username === profile.username ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{m.sender_username}</div>
            <div>{m.body}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message…" />
        <button type="button" className="btn btn-primary" disabled={!body.trim() || sendMut.isPending} onClick={() => sendMut.mutate()}>
          Send
        </button>
      </div>
    </div>
  )
}
