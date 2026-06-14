import { BookingConfirmationState } from './BookingConfirmationState'

type Action = {
  label: string
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}

type Props = {
  title?: string
  message?: string
  actions?: Action[]
  className?: string
}

export function UserBookingSuccessState({
  title = 'Request sent',
  message = 'The provider will review your request and confirm the details.',
  actions = [
    { label: 'View my bookings', to: '/dashboard#bookings', variant: 'primary' },
    { label: 'Message provider', to: '/messages', variant: 'ghost' },
    { label: 'Continue exploring', to: '/', variant: 'ghost' },
  ],
  className = '',
}: Props) {
  return (
    <BookingConfirmationState
      title={title}
      message={message}
      actions={actions}
      className={className}
    />
  )
}
