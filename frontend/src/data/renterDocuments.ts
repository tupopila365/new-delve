/** Documents rental providers commonly require from travellers (like major car-hire sites). */

export type RenterDocumentOption = {
  id: string
  label: string
  hint: string
}

export const RENTER_DOCUMENT_OPTIONS: RenterDocumentOption[] = [
  {
    id: 'driver_license_front',
    label: "Driver's license (front)",
    hint: 'Clear photo of the front of a valid license in your name.',
  },
  {
    id: 'driver_license_back',
    label: "Driver's license (back)",
    hint: 'Photo of the reverse side showing endorsements or restrictions.',
  },
  {
    id: 'national_id',
    label: 'National ID / passport',
    hint: 'Government-issued photo ID — passport bio page is fine for visitors.',
  },
  {
    id: 'proof_of_address',
    label: 'Proof of address',
    hint: 'Recent utility bill or bank statement (usually within 3 months).',
  },
  {
    id: 'international_permit',
    label: 'International driving permit',
    hint: 'Required for some foreign licenses when driving in Namibia.',
  },
]

export type RenterDocumentUpload = {
  doc_type: string
  file_name: string
  image_data: string
}

export function renterDocMeta(docType: string): RenterDocumentOption | undefined {
  return RENTER_DOCUMENT_OPTIONS.find((d) => d.id === docType)
}

export function renterDocLabel(docType: string): string {
  return renterDocMeta(docType)?.label ?? docType
}

export function missingRenterDocuments(
  required: string[],
  uploads: Record<string, RenterDocumentUpload | undefined>,
): string[] {
  return required.filter((id) => !uploads[id]?.image_data)
}
