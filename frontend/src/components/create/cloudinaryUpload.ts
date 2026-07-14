import { apiFetch } from '../../api/client'

export type CloudinaryResourceType = 'image' | 'video'

export type CloudinarySignResponse =
  | {
      direct_upload: true
      cloud_name: string
      api_key: string
      timestamp: number
      signature: string
      folder: string
      resource_type: CloudinaryResourceType
      upload_url: string
      /** Prefer chunked upload at or above this size (bytes). */
      chunk_threshold_bytes: number
      /** Chunk size for Cloudinary (≥5MB required except last chunk). */
      chunk_size_bytes: number
      /** When true, grade-only videos skip server bake (CDN transforms). */
      grade_delivery?: boolean
    }
  | {
      direct_upload: false
      detail?: string
    }

export type CloudinaryUploadResult = {
  public_id: string
  secure_url: string
  resource_type: CloudinaryResourceType
  bytes?: number
  format?: string
  duration?: number
}

export type CloudinaryUploadOptions = {
  /** 0–1 progress callback while uploading (especially useful for chunked video). */
  onProgress?: (ratio: number) => void
  /** Force single-shot even when over the chunk threshold. */
  forceSingle?: boolean
}

type CloudinaryApiBody = {
  public_id?: string
  secure_url?: string
  resource_type?: string
  bytes?: number
  format?: string
  duration?: number
  done?: boolean
  error?: { message?: string }
}

const DEFAULT_CHUNK_THRESHOLD = 10 * 1024 * 1024
const DEFAULT_CHUNK_SIZE = 6 * 1024 * 1024

/** Ask the API for a short-lived signed Cloudinary upload. */
export async function fetchCloudinarySign(
  resourceType: CloudinaryResourceType,
): Promise<CloudinarySignResponse> {
  return apiFetch<CloudinarySignResponse>('/api/social/media/sign/', {
    method: 'POST',
    body: JSON.stringify({ resource_type: resourceType }),
  })
}

function parseUploadBody(body: CloudinaryApiBody | null, status: number): CloudinaryUploadResult {
  if (!body?.public_id || !body?.secure_url) {
    const msg = body?.error?.message || `Cloudinary upload failed (${status})`
    throw new Error(msg)
  }
  return {
    public_id: body.public_id,
    secure_url: body.secure_url,
    resource_type: body.resource_type === 'video' ? 'video' : 'image',
    bytes: body.bytes,
    format: body.format,
    duration: body.duration,
  }
}

function uniqueUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `up_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function uploadSingleShot(
  file: File,
  sign: Extract<CloudinarySignResponse, { direct_upload: true }>,
  onProgress?: (ratio: number) => void,
): Promise<CloudinaryUploadResult> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', sign.api_key)
  fd.append('timestamp', String(sign.timestamp))
  fd.append('signature', sign.signature)
  fd.append('folder', sign.folder)

  onProgress?.(0.05)
  const res = await fetch(sign.upload_url, { method: 'POST', body: fd })
  const body = (await res.json().catch(() => null)) as CloudinaryApiBody | null
  if (!res.ok) {
    throw new Error(body?.error?.message || `Cloudinary upload failed (${res.status})`)
  }
  onProgress?.(1)
  return parseUploadBody(body, res.status)
}

/**
 * Chunked Cloudinary upload for large videos (flaky mobile networks).
 * Uses X-Unique-Upload-Id + Content-Range so Cloudinary can stitch parts.
 */
async function uploadChunked(
  file: File,
  sign: Extract<CloudinarySignResponse, { direct_upload: true }>,
  chunkSize: number,
  onProgress?: (ratio: number) => void,
): Promise<CloudinaryUploadResult> {
  const uploadId = uniqueUploadId()
  const total = file.size
  let start = 0
  let lastResult: CloudinaryUploadResult | null = null

  while (start < total) {
    const endExclusive = Math.min(start + chunkSize, total)
    const endInclusive = endExclusive - 1
    const blob = file.slice(start, endExclusive)

    const fd = new FormData()
    fd.append('file', blob, file.name || 'chunk.bin')
    fd.append('api_key', sign.api_key)
    fd.append('timestamp', String(sign.timestamp))
    fd.append('signature', sign.signature)
    fd.append('folder', sign.folder)

    const res = await fetch(sign.upload_url, {
      method: 'POST',
      body: fd,
      headers: {
        'X-Unique-Upload-Id': uploadId,
        'Content-Range': `bytes ${start}-${endInclusive}/${total}`,
      },
    })
    const body = (await res.json().catch(() => null)) as CloudinaryApiBody | null
    if (!res.ok) {
      throw new Error(body?.error?.message || `Cloudinary chunk failed (${res.status})`)
    }

    // Intermediate chunks often return { done: false } without a public_id.
    if (body?.public_id && body?.secure_url) {
      lastResult = parseUploadBody(body, res.status)
    }

    start = endExclusive
    onProgress?.(Math.min(1, start / total))
  }

  if (!lastResult) {
    throw new Error('Cloudinary chunked upload finished without a final asset.')
  }
  onProgress?.(1)
  return lastResult
}

/**
 * Upload a file straight to Cloudinary using a signed payload from the API.
 * Large videos use chunked upload automatically.
 */
export async function uploadFileToCloudinary(
  file: File,
  resourceType: CloudinaryResourceType,
  options: CloudinaryUploadOptions = {},
): Promise<CloudinaryUploadResult> {
  const sign = await fetchCloudinarySign(resourceType)
  if (!sign.direct_upload) {
    throw new Error('Direct Cloudinary upload is not available.')
  }

  const threshold = sign.chunk_threshold_bytes || DEFAULT_CHUNK_THRESHOLD
  const chunkSize = Math.max(sign.chunk_size_bytes || DEFAULT_CHUNK_SIZE, 5 * 1024 * 1024)
  const useChunked =
    !options.forceSingle &&
    resourceType === 'video' &&
    file.size >= threshold

  if (useChunked) {
    return uploadChunked(file, sign, chunkSize, options.onProgress)
  }
  return uploadSingleShot(file, sign, options.onProgress)
}

/** True when the API reports signed direct upload is configured. */
export async function isDirectCloudinaryUploadEnabled(): Promise<boolean> {
  try {
    const sign = await fetchCloudinarySign('image')
    return Boolean(sign.direct_upload)
  } catch {
    return false
  }
}
