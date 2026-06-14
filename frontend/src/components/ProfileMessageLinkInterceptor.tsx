import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function ProfileMessageLinkInterceptor() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest('a.up__action-btn[href="/messages"]') as HTMLAnchorElement | null
      if (!link) return

      const match = location.pathname.match(/^\/u\/([^/]+)$/)
      if (!match) return

      event.preventDefault()
      navigate(`/messages/u/${encodeURIComponent(decodeURIComponent(match[1]))}`)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [location.pathname, navigate])

  return null
}
