/**
 * Architecture boundary (permanent):
 * Browser → Cloudinary for media files
 * Browser → Delve API → PostgreSQL for media metadata
 *
 * Never POST media bytes to Backend V2. Never store Base64 in React state longer than needed.
 */

import type { MediaAssetDto, MediaPurpose, MediaUploadSignatureResponse } from '@delve/contracts'
import { getStoredAccessToken } from '../api/authClient'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

export type LocalFileValidation = {
  ok: boolean
  error?: string
}

const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX = 5 * 1024 * 1024

const POST_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]
const POST_MAX = 100 * 1024 * 1024

export function validateLocalFile(file: File, purpose: MediaPurpose): LocalFileValidation {
  if (purpose === 'avatar' || purpose === 'cover') {
    if (!AVATAR_MIME.includes(file.type)) {
      return { ok: false, error: 'Use a JPEG, PNG or WebP image.' }
    }
    const max = purpose === 'cover' ? 10 * 1024 * 1024 : AVATAR_MAX
    if (file.size > max) {
      return { ok: false, error: purpose === 'cover' ? 'Images must be 10 MB or smaller.' : 'Images must be 5 MB or smaller.' }
    }
    return { ok: true }
  }
  if (purpose === 'post') {
    if (!POST_MIME.includes(file.type)) {
      return { ok: false, error: 'Use a JPEG, PNG, WebP image or MP4/WebM video.' }
    }
    if (file.size > POST_MAX) {
      return { ok: false, error: 'Media must be 100 MB or smaller.' }
    }
  }
  return { ok: true }
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: { code?: string; message?: string }
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || 'Media request failed')
  }
  return body.data as T
}

export async function requestUploadSignature(input: {
  purpose: MediaPurpose
  originalFilename: string
  mimeType: string
  bytes: number
}): Promise<MediaUploadSignatureResponse> {
  const token = getStoredAccessToken()
  const res = await fetch(`${apiBase()}/media/upload-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  })
  return parseJson<MediaUploadSignatureResponse>(res)
}

export type CloudinaryUploadResult = {
  public_id: string
  asset_id?: string
  version?: number
  resource_type: string
  format: string
  bytes: number
  width?: number
  height?: number
  duration?: number
  secure_url?: string
}

export async function uploadFileToCloudinary(
  file: File,
  sign: MediaUploadSignatureResponse,
  options: {
    onProgress?: (ratio: number) => void
    signal?: AbortSignal
  } = {},
): Promise<CloudinaryUploadResult> {
  const threshold = sign.chunkThresholdBytes || 100 * 1024 * 1024
  const chunkSize = Math.max(sign.chunkSizeBytes || 6 * 1024 * 1024, 5 * 1024 * 1024)
  if (file.size >= threshold && (sign.resourceType === 'video' || sign.resourceType === 'auto')) {
    return uploadChunked(file, sign, chunkSize, options)
  }
  return uploadSingle(file, sign, options)
}

function uploadSingle(
  file: File,
  sign: MediaUploadSignatureResponse,
  options: { onProgress?: (ratio: number) => void; signal?: AbortSignal },
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', sign.uploadUrl)
    xhr.responseType = 'json'
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort()
        reject(new DOMException('Upload cancelled', 'AbortError'))
      })
    }
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      const body = xhr.response as CloudinaryUploadResult & { error?: { message?: string } }
      if (xhr.status >= 200 && xhr.status < 300 && body?.public_id) {
        options.onProgress?.(1)
        resolve(body)
        return
      }
      reject(new Error(body?.error?.message || `Cloudinary upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and retry.'))
    const fd = new FormData()
    fd.append('file', file)
    for (const [key, value] of Object.entries(sign.requiredParams)) {
      fd.append(key, value)
    }
    xhr.send(fd)
  })
}

async function uploadChunked(
  file: File,
  sign: MediaUploadSignatureResponse,
  chunkSize: number,
  options: { onProgress?: (ratio: number) => void; signal?: AbortSignal },
): Promise<CloudinaryUploadResult> {
  const uploadId = crypto.randomUUID()
  const total = file.size
  let start = 0
  let last: CloudinaryUploadResult | null = null

  while (start < total) {
    if (options.signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
    const endExclusive = Math.min(start + chunkSize, total)
    const blob = file.slice(start, endExclusive)
    const fd = new FormData()
    fd.append('file', blob, file.name || 'chunk.bin')
    for (const [key, value] of Object.entries(sign.requiredParams)) {
      fd.append(key, value)
    }
    const res = await fetch(sign.uploadUrl, {
      method: 'POST',
      body: fd,
      signal: options.signal,
      headers: {
        'X-Unique-Upload-Id': uploadId,
        'Content-Range': `bytes ${start}-${endExclusive - 1}/${total}`,
      },
    })
    const body = (await res.json()) as CloudinaryUploadResult & { error?: { message?: string } }
    if (!res.ok) throw new Error(body?.error?.message || `Cloudinary chunk failed (${res.status})`)
    if (body.public_id) last = body
    start = endExclusive
    options.onProgress?.(Math.min(1, start / total))
  }
  if (!last) throw new Error('Chunked upload finished without a final asset.')
  return last
}

export async function completeMediaUpload(input: {
  uploadIntentId: string
  completionToken: string
  result: CloudinaryUploadResult
  altText?: string
}): Promise<MediaAssetDto> {
  const token = getStoredAccessToken()
  const res = await fetch(`${apiBase()}/media/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      uploadIntentId: input.uploadIntentId,
      publicId: input.result.public_id,
      cloudinaryAssetId: input.result.asset_id,
      version: input.result.version,
      resourceType: input.result.resource_type === 'video' ? 'video' : 'image',
      format: input.result.format,
      bytes: input.result.bytes,
      width: input.result.width,
      height: input.result.height,
      duration: input.result.duration,
      secureUrl: input.result.secure_url,
      signature: input.completionToken,
      altText: input.altText,
    }),
  })
  return parseJson<MediaAssetDto>(res)
}

export async function deleteMediaAsset(mediaId: string) {
  const token = getStoredAccessToken()
  const res = await fetch(`${apiBase()}/media/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return parseJson<{ id: string; status: string; message: string }>(res)
}
