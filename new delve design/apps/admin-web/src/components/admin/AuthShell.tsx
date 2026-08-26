import type { ReactNode } from 'react'

export function AuthShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(140,82,255,0.18), transparent), radial-gradient(900px 500px at 100% 0%, rgba(255,250,242,0.06), transparent), var(--bg)',
      }}
    >
      <div className={wide ? 'w-full max-w-5xl' : 'w-full max-w-md'}>{children}</div>
    </div>
  )
}
