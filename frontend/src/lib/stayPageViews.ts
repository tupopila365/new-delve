import { apiFetch, getAccessToken } from '../api/client'

/** Fire-and-forget stay/room page view for provider analytics. */
export function recordStayPageView(listingId: string | number, roomName?: string | null) {
  const body: { room_name?: string } = {}
  const room = (roomName || '').trim()
  if (room) body.room_name = room
  const signedIn = Boolean(getAccessToken())
  void apiFetch(`/api/accommodation/listings/${listingId}/record-view/`, {
    method: 'POST',
    auth: signedIn,
    body: JSON.stringify(body),
  }).catch(() => {
    // Analytics must not block the page.
  })
}
