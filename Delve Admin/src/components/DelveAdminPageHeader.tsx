type Props = {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function DelveAdminPageHeader({ title, subtitle, action }: Props) {
  return (
    <header className="da-head">
      <div className="da-head__copy">
        <h1 className="da-head__title">{title}</h1>
        {subtitle ? <p className="da-head__sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="da-head__action">{action}</div> : null}
    </header>
  )
}
