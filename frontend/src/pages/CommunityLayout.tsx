import { Outlet } from 'react-router-dom'
import { CommunityMediaViewerProvider } from '../components/community/CommunityMediaViewer'

export function CommunityLayout() {
  return (
    <CommunityMediaViewerProvider>
      <Outlet />
    </CommunityMediaViewerProvider>
  )
}
