export type BusinessVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended'

export function verificationStatusLabel(status?: string) {
  switch (status) {
    case 'verified':
      return 'Verified'
    case 'pending':
      return 'Pending review'
    case 'rejected':
      return 'Rejected'
    case 'suspended':
      return 'Suspended'
    default:
      return 'Unverified'
  }
}

export function verificationStatusHint(status?: string, notes?: string) {
  switch (status) {
    case 'verified':
      return 'Your business badge is visible to travellers on listings and your public profile.'
    case 'pending':
      return 'Our team is reviewing your documents. This usually takes 2–3 business days.'
    case 'rejected':
      return notes?.trim()
        ? `Review feedback: ${notes.trim()}`
        : 'Your submission was not approved. Update your documents and resubmit for review.'
    case 'suspended':
      return notes?.trim()
        ? `Account suspended: ${notes.trim()}`
        : 'Your business verification is suspended. Contact support if you believe this is a mistake.'
    default:
      return 'Submit business documents to earn a verified badge and build traveller trust.'
  }
}

export function canResubmitVerification(status?: string) {
  return status === 'rejected' || status === 'unverified'
}
