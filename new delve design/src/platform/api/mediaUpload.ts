import { apiFetch } from './client'

export type MediaKind = 'image' | 'video'

type CloudinarySignResponse =
  | {
      direct_upload: true
      cloud_name: string
      api_key: string
      timestamp: number
      signature: string
      folder: string
      resource_type: MediaKind
      upload_url: string
      chunk_threshold_bytes?: number
      chunk_size_bytes?: number
    }
  | {
      direct_upload: false
      detail?: string
    }

type CloudinaryUploadResult = {
  public_id: string
  secure_url: string
  resource_type: MediaKind
}

const DEFAULT_CHUNK_THRESHOLD = 10 * 1024 * 1024
const DEFAULT_CHUNK_SIZE = 6 * 1024 * 1024

let directUploadCache: boolean | null = null

export function mediaKindFromFile(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video'
  const name = (file.name || '').toLowerCase()
  if (/\.(mp4|webm|mov|m4v)$/.test(name)) return 'video'
  return 'image'
}

async function fetchCloudinarySign(resourceType: MediaKind): Promise<CloudinarySignResponse> {
  return apiFetch<CloudinarySignResponse>('/api/social/media/sign/', {
    method: 'POST',
    body: JSON.stringify({ resource_type: resourceType }),
  })
}

export async function getDirectUploadEnabled(): Promise<boolean> {
  if (directUploadCache != null) return directUploadCache
  try {
    const sign = await fetchCloudinarySign('image')
    directUploadCache = Boolean(sign.direct_upload)
    return directUploadCache
  } catch {
    directUploadCache = false
    return false
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
  const body = (await res.json().catch(() => null)) as {
    public_id?: string
    secure_url?: string
    resource_type?: string
    error?: { message?: string }
  } | null
  if (!res.ok || !body?.public_id || !body?.secure_url) {
    throw new Error(body?.error?.message || `Cloudinary upload failed (${res.status})`)
  }
  onProgress?.(1)
  return {
    public_id: body.public_id,
    secure_url: body.secure_url,
    resource_type: body.resource_type === 'video' ? 'video' : 'image',
  }
}

async function uploadChunked(
  file: File,
  sign: Extract<CloudinarySignResponse, { direct_upload: true }>,
  chunkSize: number,
  onProgress?: (ratio: number) => void,
): Promise<CloudinaryUploadResult> {
  const uploadId = uniqueUploadId()
  const total = file.size
  let start = 0
  let last: CloudinaryUploadResult | null = null

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
    const body = (await res.json().catch(() => null)) as {
      public_id?: string
      secure_url?: string
      resource_type?: string
      error?: { message?: string }
    } | null
    if (!res.ok) {
      throw new Error(body?.error?.message || `Cloudinary chunk failed (${res.status})`)
    }
    if (body?.public_id && body?.secure_url) {
      last = {
        public_id: body.public_id,
        secure_url: body.secure_url,
        resource_type: body.resource_type === 'video' ? 'video' : 'image',
      }
    }
    start = endExclusive
    onProgress?.(Math.min(1, start / total))
  }

  if (!last) throw new Error('Cloudinary chunked upload finished without a final asset.')
  onProgress?.(1)
  return last
}

async function uploadViaCloudinary(
  file: File,
  kind: MediaKind,
  onProgress?: (ratio: number) => void,
): Promise<string | null> {
  const enabled = await getDirectUploadEnabled()
  if (!enabled) return null
  try {
    const sign = await fetchCloudinarySign(kind)
    if (!sign.direct_upload) return null
    const threshold = sign.chunk_threshold_bytes || DEFAULT_CHUNK_THRESHOLD
    const chunkSize = Math.max(sign.chunk_size_bytes || DEFAULT_CHUNK_SIZE, 5 * 1024 * 1024)
    const useChunked = kind === 'video' && file.size >= threshold
    const result = useChunked
      ? await uploadChunked(file, sign, chunkSize, onProgress)
      : await uploadSingleShot(file, sign, onProgress)
    return result.secure_url
  } catch {
    return null
  }
}

async function uploadViaHighlightProxy(
  file: File,
  kind: MediaKind,
  onProgress?: (ratio: number) => void,
): Promise<{ url: string; kind: MediaKind }> {
  onProgress?.(0.15)
  const fd = new FormData()
  fd.append('file', file, file.name || (kind === 'video' ? 'clip.mp4' : 'slide.jpg'))
  const result = await apiFetch<{ url: string; kind: MediaKind }>('/api/highlights/upload/', {
    method: 'POST',
    body: fd,
  })
  onProgress?.(1)
  return { url: result.url, kind: result.kind === 'video' ? 'video' : 'image' }
}

/**
 * Delvers-style media upload: Cloudinary direct when configured, else server proxy.
 */
export async function uploadAdminStoryMedia(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<{ url: string; kind: MediaKind }> {
  const kind = mediaKindFromFile(file)
  const directUrl = await uploadViaCloudinary(file, kind, onProgress)
  if (directUrl) return { url: directUrl, kind }
  return uploadViaHighlightProxy(file, kind, onProgress)
}
