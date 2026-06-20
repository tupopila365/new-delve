import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './listing-see-all.css'

type Props = {
  title: string
  subtitle?: string
  backTo?: string
  loading?: boolean
  notFound?: boolean
  notFoundMessage?: string
  children: ReactNode
}

export function ListingSeeAllLayout({
  title,
  subtitle,
  backTo,
  loading,
  notFound,
  notFoundMessage = 'This listing could not be found.',
  children,
}: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  return (
    <div className="listing-see-all">
      <header className="listing-see-all__bar">
        <button type="button" className="listing-see-all__back" onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <div className="listing-see-all__head">
          <h1 className="listing-see-all__title">{title}</h1>
          {subtitle ? <p className="listing-see-all__sub">{subtitle}</p> : null}
        </div>
      </header>

      {loading ? (
        <div className="listing-see-all__loading" aria-busy="true" aria-label="Loading">
          <div className="skeleton listing-see-all__sk" />
          <div className="skeleton listing-see-all__sk listing-see-all__sk--short" />
          <div className="skeleton listing-see-all__sk listing-see-all__sk--short" />
        </div>
      ) : null}

      {!loading && notFound ? (
        <div className="listing-see-all__empty" role="status">
          <p>{notFoundMessage}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleBack}>
            Go back
          </button>
        </div>
      ) : null}

      {!loading && !notFound ? children : null}
    </div>
  )
}
