export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ border: '1px dashed var(--border)' }}>
      <p className="text-sm font-semibold m-0">{title}</p>
      {detail ? (
        <p className="text-sm m-0 mt-1" style={{ color: 'var(--muted)' }}>
          {detail}
        </p>
      ) : null}
    </div>
  )
}
