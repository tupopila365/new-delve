import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  mine?: boolean
  active?: boolean
  children: ReactNode
}

export function ChatMessageRow({ mine = false, active = false, className = '', children, ...rest }: Props) {
  return (
    <div
      className={[
        'chat-message',
        mine ? 'chat-message--mine' : '',
        active ? 'chat-message--active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
