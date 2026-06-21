import { useRef } from 'react'
import { Camera, Check, X } from 'lucide-react'
import { renterDocMeta } from '../../../data/renterDocuments'
import type { RenterDocumentUpload } from '../../../data/renterDocuments'

type Props = {
  required: string[]
  uploads: Record<string, RenterDocumentUpload | undefined>
  onUpload: (docType: string, file: File) => void
  onRemove: (docType: string) => void
  disabled?: boolean
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export function RenterDocumentUploads({ required, uploads, onUpload, onRemove, disabled }: Props) {
  if (required.length === 0) return null

  return (
    <div className="rental-docs">
      <p className="rental-docs__title">Upload your documents</p>
      <p className="rental-docs__sub">
        The provider needs clear photos before approving your rental — same as most car-hire companies.
      </p>
      <ul className="rental-docs__list">
        {required.map((docType) => (
          <RenterDocRow
            key={docType}
            docType={docType}
            upload={uploads[docType]}
            onUpload={onUpload}
            onRemove={onRemove}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  )
}

function RenterDocRow({
  docType,
  upload,
  onUpload,
  onRemove,
  disabled,
}: {
  docType: string
  upload?: RenterDocumentUpload
  onUpload: (docType: string, file: File) => void
  onRemove: (docType: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const meta = renterDocMeta(docType)

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return
    if (!file.type.startsWith('image/')) return
    onUpload(docType, file)
  }

  return (
    <li className={`rental-docs__item${upload ? ' rental-docs__item--done' : ''}`}>
      <div className="rental-docs__item-head">
        <div>
          <strong>{meta?.label ?? docType}</strong>
          {meta?.hint ? <span className="rental-docs__hint">{meta.hint}</span> : null}
        </div>
        {upload ? (
          <span className="rental-docs__check" aria-hidden>
            <Check size={14} strokeWidth={2.5} />
          </span>
        ) : null}
      </div>

      {upload?.image_data ? (
        <div className="rental-docs__preview-wrap">
          <img src={upload.image_data} alt="" className="rental-docs__preview" />
          <button
            type="button"
            className="rental-docs__remove"
            aria-label={`Remove ${meta?.label ?? docType}`}
            onClick={() => onRemove(docType)}
            disabled={disabled}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="rental-docs__file-input"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {!upload ? (
        <button
          type="button"
          className="rental-docs__upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Camera size={15} strokeWidth={2.25} aria-hidden />
          Take photo or upload image
        </button>
      ) : (
        <button
          type="button"
          className="rental-docs__upload-btn rental-docs__upload-btn--ghost"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Replace image
        </button>
      )}
    </li>
  )
}

export async function renterUploadFromFile(docType: string, file: File): Promise<RenterDocumentUpload> {
  const image_data = await fileToDataUrl(file)
  return { doc_type: docType, file_name: file.name, image_data }
}
