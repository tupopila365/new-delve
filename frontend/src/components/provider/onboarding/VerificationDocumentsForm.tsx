import { useRef } from 'react'
import { Upload } from 'lucide-react'
import type { VerificationDocField } from '../../../data/providerOnboarding'
import {
  ONBOARDING_SERVICE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
  hasMandatoryVerification,
  servicesRequiringVerification,
} from '../../../data/providerOnboarding'
import type { OnboardingServiceType, TransportMode } from '../../../data/providerOnboarding'

export type UploadedDoc = {
  docType: string
  file: File
  fileName: string
}

type Props = {
  services: OnboardingServiceType[]
  docFields: VerificationDocField[]
  uploads: UploadedDoc[]
  verifyFood: boolean
  onVerifyFoodChange: (v: boolean) => void
  onUpload: (docType: string, file: File) => void
  onRemove: (docType: string) => void
  error?: string | null
  transportModes?: TransportMode[]
}

export function VerificationDocumentsForm({
  services,
  docFields,
  uploads,
  verifyFood,
  onVerifyFoodChange,
  onUpload,
  onRemove,
  error,
  transportModes = [],
}: Props) {
  const mandatory = hasMandatoryVerification(services)
  const hasFood = services.includes('food_drink')

  if (!mandatory && hasFood && !verifyFood) {
    return (
      <div className="prov-onboard__section">
        <div className="prov-onboard__head">
          <h1 className="prov-onboard__title">Verification</h1>
          <p className="prov-onboard__sub">
            Optional for food &amp; drink — get verified for a trust badge, or skip and start listing.
          </p>
        </div>
        <label className="prov-onboard__opt-in">
          <input type="checkbox" checked={verifyFood} onChange={(e) => onVerifyFoodChange(e.target.checked)} />
          <span>I&apos;d like to get verified</span>
        </label>
      </div>
    )
  }

  const verifyLabels = servicesRequiringVerification(services)
    .map((id) => ONBOARDING_SERVICE_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join(', ')

  const transportModeLabels = transportModes
    .map((m) => TRANSPORT_MODE_OPTIONS.find((o) => o.id === m)?.label ?? m)
    .join(' & ')

  return (
    <div className="prov-onboard__section">
      <div className="prov-onboard__head">
        <h1 className="prov-onboard__title">Upload business documents</h1>
        <p className="prov-onboard__sub">
          {mandatory ? (
            <>
              <strong>{verifyLabels}</strong> need verification before accepting bookings.
            </>
          ) : (
            <>Upload documents to get verified.</>
          )}
        </p>
        {services.includes('transport') && transportModes.length > 0 ? (
          <p className="prov-onboard__sub">
            For <strong>{transportModeLabels}</strong> — company registration and operator permits from your
            government authority. Traveller ID or driver&apos;s licences are not required here.
          </p>
        ) : null}
      </div>

      {hasFood ? (
        <label className="prov-onboard__opt-in">
          <input type="checkbox" checked={verifyFood} onChange={(e) => onVerifyFoodChange(e.target.checked)} />
          <span>{mandatory ? 'Also verify food & drink (optional)' : 'Verify my food & drink business'}</span>
        </label>
      ) : null}

      {error ? <p className="prov-onboard__error">{error}</p> : null}

      {docFields.length > 0 ? (
        <ul className="prov-onboard__doc-list">
          {docFields.map((field) => (
            <DocUploadRow
              key={field.id}
              field={field}
              upload={uploads.find((u) => u.docType === field.id)}
              onUpload={(file) => onUpload(field.id, file)}
              onRemove={() => onRemove(field.id)}
            />
          ))}
        </ul>
      ) : null}

      <p className="prov-onboard__doc-note">PDF, JPG or PNG · reviewed in 2–3 days</p>
    </div>
  )
}

function DocUploadRow({
  field,
  upload,
  onUpload,
  onRemove,
}: {
  field: VerificationDocField
  upload?: UploadedDoc
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <li className={`prov-onboard__doc${upload ? ' prov-onboard__doc--done' : ''}`}>
      <div className="prov-onboard__doc-info">
        <span className="prov-onboard__doc-label">
          {field.label}
          {field.required ? <em>Required</em> : null}
        </span>
        {upload ? <span className="prov-onboard__doc-file">{upload.fileName}</span> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="prov-onboard__file-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
      />
      {upload ? (
        <button type="button" className="prov-onboard__doc-btn" onClick={onRemove}>
          Remove
        </button>
      ) : (
        <button type="button" className="prov-onboard__doc-btn" onClick={() => inputRef.current?.click()}>
          <Upload size={14} strokeWidth={2.25} aria-hidden />
          Upload
        </button>
      )}
    </li>
  )
}
