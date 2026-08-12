import { useRef, useState } from 'react'
import type { MediaAssetDto, MediaPurpose } from '@delve/contracts'
import {
  completeMediaUpload,
  requestUploadSignature,
  uploadFileToCloudinary,
  validateLocalFile,
} from './cloudinaryUploadClient'

export type MediaUploadPhase = 'idle' | 'preview' | 'uploading' | 'completing' | 'processing' | 'ready' | 'error'

const MAX_CONCURRENT = 3
let activeUploads = 0
const waitQueue: Array<() => void> = []

async function acquireSlot() {
  if (activeUploads < MAX_CONCURRENT) {
    activeUploads += 1
    return
  }
  await new Promise<void>(resolve => waitQueue.push(resolve))
  activeUploads += 1
}

function releaseSlot() {
  activeUploads = Math.max(0, activeUploads - 1)
  const next = waitQueue.shift()
  next?.()
}

export function useMediaUpload(purpose: MediaPurpose = 'avatar') {
  const [phase, setPhase] = useState<MediaUploadPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [asset, setAsset] = useState<MediaAssetDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const fileRef = useRef<File | null>(null)
  const optsRef = useRef<{ businessId?: string; listingId?: string } | undefined>(undefined)
  const altTextRef = useRef<string | undefined>(undefined)

  function revokePreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    revokePreview()
    fileRef.current = null
    optsRef.current = undefined
    altTextRef.current = undefined
    setPhase('idle')
    setProgress(0)
    setPreviewUrl(null)
    setSelectedFileName(null)
    setAsset(null)
    setError(null)
    setBusy(false)
  }

  function cancel() {
    abortRef.current?.abort()
    setError('Upload cancelled.')
    setPhase('error')
    setBusy(false)
  }

  async function start(
    file: File,
    altText?: string,
    opts?: { businessId?: string; listingId?: string },
  ): Promise<MediaAssetDto | null> {
    if (busy) return null
    const local = validateLocalFile(file, purpose)
    if (!local.ok) {
      setError(local.error || 'Invalid file')
      setPhase('error')
      return null
    }

    revokePreview()
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    fileRef.current = file
    optsRef.current = opts
    altTextRef.current = altText
    setPreviewUrl(objectUrl)
    setSelectedFileName(file.name || 'Selected file')
    setPhase('preview')
    setError(null)
    setAsset(null)
    setProgress(0)
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller

    await acquireSlot()
    try {
      setPhase('uploading')
      const sign = await requestUploadSignature({
        purpose,
        originalFilename: file.name || 'upload',
        mimeType: file.type || 'application/octet-stream',
        bytes: file.size,
        ...(opts?.businessId ? { businessId: opts.businessId } : {}),
        ...(opts?.listingId ? { listingId: opts.listingId } : {}),
      })
      const result = await uploadFileToCloudinary(file, sign, {
        signal: controller.signal,
        onProgress: ratio => setProgress(ratio),
      })
      setPhase('completing')
      const saved = await completeMediaUpload({
        uploadIntentId: sign.uploadIntentId,
        completionToken: sign.completionToken,
        result,
        altText,
      })
      revokePreview()
      setPreviewUrl(null)
      setAsset(saved)
      setPhase(saved.status === 'PROCESSING' ? 'processing' : 'ready')
      setProgress(1)
      return saved
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Upload cancelled.')
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed. You can retry.')
      }
      setPhase('error')
      return null
    } finally {
      releaseSlot()
      setBusy(false)
      abortRef.current = null
    }
  }

  async function retry() {
    if (!fileRef.current) return
    await start(fileRef.current, altTextRef.current, optsRef.current)
  }

  return {
    phase,
    progress,
    previewUrl,
    selectedFileName,
    asset,
    error,
    busy,
    isUploading: busy || phase === 'uploading' || phase === 'completing',
    start,
    cancel,
    retry,
    reset,
  }
}
