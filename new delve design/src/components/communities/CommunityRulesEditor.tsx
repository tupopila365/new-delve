import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { CommunityRule } from '@delve/contracts'
import { createCommunityRule, deleteCommunityRule } from '../../api/communityClient'

export default function CommunityRulesEditor({
  communityId,
  rules,
  onChanged,
}: {
  communityId: string
  rules: CommunityRule[]
  onChanged: (next: CommunityRule[]) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function addRule() {
    const trimmed = title.trim()
    if (!trimmed) return
    setBusy('add')
    setError(null)
    try {
      const created = await createCommunityRule(communityId, {
        title: trimmed,
        description: description.trim() || undefined,
        sortOrder: rules.length,
      })
      onChanged([...rules, created])
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add rule')
    } finally {
      setBusy(null)
    }
  }

  async function removeRule(ruleId: string) {
    setBusy(ruleId)
    setError(null)
    try {
      await deleteCommunityRule(communityId, ruleId)
      onChanged(rules.filter(r => r.id !== ruleId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete rule')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-3">
      <h4 className="text-xs font-bold uppercase m-0" style={{ color: 'var(--fg-muted)' }}>Community rules</h4>
      {error && <p className="text-xs m-0" style={{ color: '#E11D48' }}>{error}</p>}
      {rules.length > 0 && (
        <ol className="space-y-2 m-0 pl-4">
          {rules.map((rule, i) => (
            <li key={rule.id} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <span className="flex-1">
                <strong style={{ color: 'var(--fg)' }}>{i + 1}. {rule.title}</strong>
                {rule.description ? <p className="m-0 mt-0.5">{rule.description}</p> : null}
              </span>
              <button
                type="button"
                disabled={busy === rule.id}
                onClick={() => void removeRule(rule.id)}
                className="p-1.5 rounded-lg disabled:opacity-50"
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
                aria-label="Delete rule"
              >
                {busy === rule.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="space-y-2 p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Rule title"
          maxLength={120}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
          style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        />
        <button
          type="button"
          disabled={busy === 'add' || !title.trim()}
          onClick={() => void addRule()}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
        >
          {busy === 'add' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add rule
        </button>
      </div>
    </section>
  )
}
