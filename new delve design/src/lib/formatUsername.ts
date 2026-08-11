/** Display Delve usernames consistently as @handle (canonical lowercase). */
export function formatUsername(username: string | null | undefined): string {
  if (!username) return ''
  const cleaned = username.trim().replace(/^@+/, '').toLowerCase()
  return cleaned ? `@${cleaned}` : ''
}

export default formatUsername
