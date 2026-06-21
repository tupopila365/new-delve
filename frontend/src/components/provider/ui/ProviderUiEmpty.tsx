import { Link } from 'react-router-dom'

type Props = {
  title: string
  message?: string
  action?: { label: string; to: string }
}

export function ProviderUiEmpty({ title, message, action }: Props) {
  return (
    <div className="prov-ui__empty">
      <strong>{title}</strong>
      {message}
      {action ? (
        <p style={{ marginTop: 12 }}>
          <Link to={action.to} className="prov-ui__link">
            {action.label}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
