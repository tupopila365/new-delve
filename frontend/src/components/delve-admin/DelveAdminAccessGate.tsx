import { Link } from 'react-router-dom'

export function DelveAdminAccessGate() {
  return (
    <div className="da-gate">
      <h2>Platform admin access required</h2>
      <p>
        This area is for DELVE staff only. Sign in with a staff account or return to the main app.
      </p>
      <Link to="/">Back to DELVE</Link>
    </div>
  )
}
