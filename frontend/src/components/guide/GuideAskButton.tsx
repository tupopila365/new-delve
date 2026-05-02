import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'

type Conv = { id: number }

type Props = {
  guideUserId: number
  disabled?: boolean
  label?: string
}

export function GuideAskButton({ guideUserId, disabled, label = 'Send a question' }: Props) {
  const nav = useNavigate()
  const mut = useMutation({
    mutationFn: () =>
      apiFetch<Conv>('/api/messaging/start/', {
        method: 'POST',
        body: JSON.stringify({ user_id: guideUserId }),
      }),
    onSuccess: (c) => {
      nav(`/messages/${c.id}`)
    },
  })

  const err = mut.error instanceof ApiError ? mut.error.message : mut.error instanceof Error ? mut.error.message : null

  return (
    <div className="gd-detail__ask-wrap">
      <button
        type="button"
        className="btn btn-ghost gd-detail__ask-btn"
        disabled={disabled || mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? 'Opening…' : label}
      </button>
      {err ? <p className="gd-detail__ask-err">{err}</p> : null}
    </div>
  )
}
