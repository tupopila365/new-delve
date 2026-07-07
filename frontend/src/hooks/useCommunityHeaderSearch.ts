import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { communityTagPath, parseTagFromSearch } from '../utils/communityTags'

export function useCommunityHeaderSearch() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const input = document.getElementById('cm-search') as HTMLInputElement | null
    if (!input) return

    const onInput = () => setSearchQuery(input.value)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return
      const slug = parseTagFromSearch(input.value)
      if (!slug) return
      event.preventDefault()
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'groups') {
        navigate(`/community?view=groups&tag=${encodeURIComponent(slug)}`)
        return
      }
      navigate(communityTagPath(slug))
    }

    onInput()
    input.addEventListener('input', onInput)
    input.addEventListener('keydown', onKeyDown)
    return () => {
      input.removeEventListener('input', onInput)
      input.removeEventListener('keydown', onKeyDown)
    }
  }, [navigate])

  return searchQuery
}
