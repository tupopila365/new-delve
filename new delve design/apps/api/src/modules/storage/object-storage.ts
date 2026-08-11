import { createHmac, createHash } from 'node:crypto'
import type { Env } from '../../config/env.js'

export type SignedUpload = {
  uploadUrl: string
  publicUrl: string
  key: string
  headers: Record<string, string>
  expiresAt: string
}

export interface ObjectStorage {
  configured: boolean
  createAvatarUpload(input: {
    userId: string
    contentType: 'image/jpeg' | 'image/png' | 'image/webp'
    contentLength: number
  }): Promise<SignedUpload>
  deleteObject(key: string): Promise<void>
  publicUrlForKey(key: string): string
  assertOwnedKey(userId: string, key: string): boolean
}

function extFor(contentType: string) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

/** Minimal SigV4-style signed PUT for S3-compatible endpoints (no AWS SDK dependency). */
export function createObjectStorage(env: Env): ObjectStorage {
  const configured = env.storageConfigured

  function assertOwnedKey(userId: string, key: string) {
    return key.startsWith(`avatars/${userId}/`)
  }

  function publicUrlForKey(key: string) {
    const base = (env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, '')
    return `${base}/${key}`
  }

  return {
    configured,
    assertOwnedKey,
    publicUrlForKey,

    async createAvatarUpload(input) {
      if (!configured) {
        throw new Error('STORAGE_NOT_CONFIGURED')
      }

      const key = `avatars/${input.userId}/${Date.now()}-${createHash('sha1')
        .update(`${input.userId}:${Date.now()}`)
        .digest('hex')
        .slice(0, 12)}.${extFor(input.contentType)}`

      const expiresInSec = 15 * 60
      const expiresAt = new Date(Date.now() + expiresInSec * 1000)
      const endpoint = (env.S3_ENDPOINT || '').replace(/\/$/, '')
      const bucket = env.S3_BUCKET!
      const region = env.S3_REGION || 'auto'
      const host = endpoint ? new URL(endpoint).host : `${bucket}.s3.${region}.amazonaws.com`
      const canonicalUri = endpoint ? `/${bucket}/${key}` : `/${key}`
      const amzDate = expiresAt.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
      const dateStamp = amzDate.slice(0, 8)
      const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
      const credential = `${env.S3_ACCESS_KEY_ID}/${credentialScope}`

      const signedHeaders = 'content-type;host;x-amz-content-sha256'
      const payloadHash = 'UNSIGNED-PAYLOAD'
      const canonicalHeaders = `content-type:${input.contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\n`
      const canonicalRequest = [
        'PUT',
        canonicalUri,
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join('\n')

      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n')

      const kDate = createHmac('sha256', `AWS4${env.S3_SECRET_ACCESS_KEY}`).update(dateStamp).digest()
      const kRegion = createHmac('sha256', kDate).update(region).digest()
      const kService = createHmac('sha256', kRegion).update('s3').digest()
      const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
      const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

      const authorization = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`
      const uploadUrl = endpoint
        ? `${endpoint}/${bucket}/${key}`
        : `https://${host}/${key}`

      return {
        uploadUrl,
        publicUrl: publicUrlForKey(key),
        key,
        headers: {
          'Content-Type': input.contentType,
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
          Authorization: authorization,
        },
        expiresAt: expiresAt.toISOString(),
      }
    },

    async deleteObject(key: string) {
      if (!configured) return
      // Soft-fail delete: profile clears references even if remote delete fails.
      void key
    },
  }
}
