import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ModerationItem } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatusBadge,
  DelveAdminVerifyDialog,
  UserInspectorDrawer,
} from '../components'
import { statusVariant } from '../data/demoData'

export function ContentModerationPage() {
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<{ item: ModerationItem; action: 'remove' | 'restore' } | null>(null)
  const [inspectUserId, setInspectUserId] = useState<number | null>(null)

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['moderation'],
    queryFn: async () => asArray<ModerationItem>(await apiFetch('/api/accounts/admin/moderation/')),
  })

  const modMut = useMutation({
    mutationFn: ({ item, action, reason }: { item: ModerationItem; action: 'remove' | 'restore'; reason: string }) =>
      apiFetch('/api/accounts/admin/moderation/', {
        method: 'PATCH',
        body: JSON.stringify({
          target_type: item.target_type,
          target_id: item.target_id,
          action,
          reason,
        }),
      }),
    onSuccess: () => {
      setDialog(null)
      void qc.invalidateQueries({ queryKey: ['moderation'] })
      void qc.invalidateQueries({ queryKey: ['reports'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Content moderation" subtitle="Reported and hidden content." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Content moderation" subtitle="Reported and hidden content." />
        <DelveAdminError message="Could not load moderation queue." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Content moderation"
        subtitle="Review reported posts and comments. Remove or restore with a reason."
      />

      {items.length === 0 ? (
        <DelveAdminEmpty title="Nothing flagged" message="Reported or hidden content will show up here." />
      ) : (
        <div className="da-stack">
          {items.map((item) => (
            <DelveAdminDataRow
              key={item.id}
              primary={`${item.target_type}: ${item.title}`}
              secondary={`@${item.author} · ${item.reason || 'No reason recorded'}`}
              badge={<DelveAdminStatusBadge status={item.status} variant={statusVariant(item.status)} />}
              actions={
                <>
                  {item.author_id ? (
                    <button
                      type="button"
                      className="da-link-btn"
                      onClick={() => setInspectUserId(item.author_id!)}
                    >
                      Inspect author
                    </button>
                  ) : null}
                  {item.status === 'hidden' ? (
                    <button
                      type="button"
                      className="da-link-btn"
                      onClick={() => setDialog({ item, action: 'restore' })}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="da-link-btn"
                      onClick={() => setDialog({ item, action: 'remove' })}
                    >
                      Remove
                    </button>
                  )}
                  {item.author_id ? (
                    <Link to={`/admin/users?inspect=${item.author_id}`} className="da-link-btn">
                      Open in Users
                    </Link>
                  ) : null}
                </>
              }
            />
          ))}
        </div>
      )}

      <DelveAdminVerifyDialog
        open={dialog != null}
        businessName={dialog ? `${dialog.item.target_type}: ${dialog.item.title}` : ''}
        mode={dialog?.action === 'remove' ? 'reject' : 'approve'}
        busy={modMut.isPending}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          if (!dialog) return
          modMut.mutate({ item: dialog.item, action: dialog.action, reason })
        }}
      />

      <UserInspectorDrawer userId={inspectUserId} onClose={() => setInspectUserId(null)} />
    </div>
  )
}
