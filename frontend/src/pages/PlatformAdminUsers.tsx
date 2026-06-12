import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

type PlatformUser = {
  id: number
  username: string
  email: string
  is_active: boolean
  is_staff: boolean
  user_type: string
  display_name: string
  date_joined: string
}

export function PlatformAdminUsers() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['platform-users'],
    queryFn: () => apiFetch<PlatformUser[]>('/api/accounts/admin/users/'),
  })

  return (
    <div className="adm-platform">
      <h1>Users</h1>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="adm-platform__table">
          {users.map((u) => (
            <div key={u.id} className="adm-platform__row">
              <div>
                <strong>{u.display_name || u.username}</strong>
                <span>@{u.username} · {u.email}</span>
              </div>
              <span className="adm-platform__pill">{u.user_type}</span>
              {u.is_staff ? <span className="adm-platform__pill adm-platform__pill--staff">Staff</span> : null}
              <span className="adm-platform__muted">{new Date(u.date_joined).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
