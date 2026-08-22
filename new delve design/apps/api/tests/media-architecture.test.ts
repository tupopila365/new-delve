import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@delve/database', () => ({
  prisma: {
    mediaUploadIntent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    mediaAsset: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    travelerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    storySlide: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    securityEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        mediaAsset: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          update: vi.fn(),
        },
        mediaUploadIntent: {
          update: vi.fn(),
        },
        travelerProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: 'profile1' }),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      }
      return fn(tx)
    }),
  },
}))

vi.mock('../src/modules/media/cloudinary.js', async () => {
  const actual = await vi.importActual<typeof import('../src/modules/media/cloudinary.js')>(
    '../src/modules/media/cloudinary.js',
  )
  return {
    ...actual,
    destroyCloudinaryAsset: vi.fn().mockResolvedValue({ ok: true, result: 'ok' }),
  }
})

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import {
  cleanupMediaRecords,
  completeUpload,
  createUploadSignature,
  deleteMedia,
  handleCloudinaryWebhook,
} from '../src/modules/media/media.service.js'
import {
  buildDeliveryUrl,
  chooseFolder,
  signCloudinaryParams,
  verifyCloudinaryNotification,
} from '../src/modules/media/cloudinary.js'
import { destroyCloudinaryAsset } from '../src/modules/media/cloudinary.js'
import { AppError } from '../src/middleware/error-handler.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  CLOUDINARY_CLOUD_NAME: 'delve-test',
  CLOUDINARY_API_KEY: 'key123',
  CLOUDINARY_API_SECRET: 'secret1234567890',
  CLOUDINARY_FOLDER_PREFIX: 'delve',
  CLOUDINARY_UPLOAD_SIGNATURE_TTL_SECONDS: '300',
})

function sha1(value: string) {
  return createHash('sha1').update(value).digest('hex')
}

describe('media architecture — Cloudinary signatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chooses server-controlled folders', () => {
    expect(chooseFolder(env, 'avatar', 'user1')).toBe('delve/users/user1/avatars')
    expect(chooseFolder(env, 'story', 'user1')).toBe('delve/users/user1/stories')
    expect(chooseFolder(env, 'listing', 'user1', 'biz1', 'list1')).toBe(
      'delve/businesses/biz1/listings/list1',
    )
  })

  it('builds delivery URLs with f_auto and q_auto', () => {
    const url = buildDeliveryUrl({
      cloudName: 'delve-test',
      publicId: 'delve/users/u1/avatars/pic',
      version: 2,
      width: 96,
      crop: 'fill',
      gravity: 'auto',
    })
    expect(url).toContain('/image/upload/f_auto,q_auto,w_96,c_fill,g_auto/v2/')
  })

  it('creates a signed upload intent for authenticated avatars', async () => {
    vi.mocked(prisma.mediaUploadIntent.create).mockResolvedValue({
      id: 'intent1',
      folder: 'delve/users/u1/avatars',
      expiresAt: new Date(Date.now() + 300_000),
    } as never)

    const result = await createUploadSignature(env, 'u1', {
      purpose: 'avatar',
      originalFilename: 'me.png',
      mimeType: 'image/png',
      bytes: 1200,
    })

    expect(result.uploadIntentId).toBe('intent1')
    expect(result.folder).toBe('delve/users/u1/avatars')
    expect(result.apiKey).toBe('key123')
    expect(JSON.stringify(result)).not.toContain('secret1234567890')
    expect(result.completionToken).toBeTruthy()
    expect(result.requiredParams.folder).toBe('delve/users/u1/avatars')
  })

  it('rejects invalid type and oversized files', async () => {
    await expect(
      createUploadSignature(env, 'u1', {
        purpose: 'avatar',
        originalFilename: 'x.gif',
        mimeType: 'image/gif',
        bytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' })

    await expect(
      createUploadSignature(env, 'u1', {
        purpose: 'avatar',
        originalFilename: 'x.png',
        mimeType: 'image/png',
        bytes: 6 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
  })

  it('rejects unavailable business purposes', async () => {
    await expect(
      createUploadSignature(env, 'u1', {
        purpose: 'listing',
        originalFilename: 'x.png',
        mimeType: 'image/png',
        bytes: 100,
        businessId: 'b1',
        listingId: 'l1',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('completes with valid completion token and is idempotent', async () => {
    const intent = {
      id: 'intent1',
      userId: 'u1',
      purpose: 'avatar',
      expectedResourceType: 'image',
      maxBytes: 5 * 1024 * 1024,
      permittedFormats: ['png', 'jpg', 'jpeg', 'webp'],
      folder: 'delve/users/u1/avatars',
      businessId: null,
      listingId: null,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
    }
    vi.mocked(prisma.mediaUploadIntent.findUnique).mockResolvedValue(intent as never)

    const completionToken = signCloudinaryParams(
      { upload_intent_id: 'intent1' },
      env.CLOUDINARY_API_SECRET!,
    )

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: never) => Promise<unknown>) => {
      const created = {
        id: 'media1',
        publicId: 'delve/users/u1/avatars/pic',
        version: 1,
        resourceType: 'image',
        format: 'png',
        bytes: 100,
        width: 200,
        height: 200,
        duration: null,
        status: 'READY',
        purpose: 'avatar',
        altText: null,
        createdAt: new Date(),
      }
      const tx = {
        mediaAsset: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(created),
          update: vi.fn(),
        },
        mediaUploadIntent: { update: vi.fn() },
        travelerProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: 'profile1' }),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      }
      return fn(tx as never)
    })

    const first = await completeUpload(env, 'u1', {
      uploadIntentId: 'intent1',
      publicId: 'delve/users/u1/avatars/pic',
      resourceType: 'image',
      format: 'png',
      bytes: 100,
      width: 200,
      height: 200,
      signature: completionToken,
    })
    expect(first.id).toBe('media1')
    expect(first.delivery.url).toContain('f_auto')

    vi.mocked(prisma.mediaUploadIntent.findUnique).mockResolvedValue({
      ...intent,
      status: 'COMPLETED',
    } as never)
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
      id: 'media1',
      publicId: 'delve/users/u1/avatars/pic',
      version: 1,
      resourceType: 'image',
      format: 'png',
      bytes: 100,
      width: 200,
      height: 200,
      duration: null,
      status: 'READY',
      purpose: 'avatar',
      altText: null,
      createdAt: new Date(),
    } as never)

    const second = await completeUpload(env, 'u1', {
      uploadIntentId: 'intent1',
      publicId: 'delve/users/u1/avatars/pic',
      resourceType: 'image',
      format: 'png',
      bytes: 100,
      signature: completionToken,
    })
    expect(second.id).toBe('media1')
  })

  it('rejects expired, reused, tampered, and bad signatures', async () => {
    vi.mocked(prisma.mediaUploadIntent.findUnique).mockResolvedValue({
      id: 'intent1',
      userId: 'u1',
      purpose: 'avatar',
      expectedResourceType: 'image',
      maxBytes: 5_000_000,
      permittedFormats: ['png'],
      folder: 'delve/users/u1/avatars',
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 1000),
    } as never)
    await expect(
      completeUpload(env, 'u1', {
        uploadIntentId: 'intent1',
        publicId: 'delve/users/u1/avatars/pic',
        resourceType: 'image',
        format: 'png',
        bytes: 10,
        signature: 'x',
      }),
    ).rejects.toMatchObject({ code: 'INTENT_EXPIRED' })

    vi.mocked(prisma.mediaUploadIntent.findUnique).mockResolvedValue({
      id: 'intent1',
      userId: 'u1',
      purpose: 'avatar',
      expectedResourceType: 'image',
      maxBytes: 5_000_000,
      permittedFormats: ['png'],
      folder: 'delve/users/u1/avatars',
      status: 'FAILED',
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    await expect(
      completeUpload(env, 'u1', {
        uploadIntentId: 'intent1',
        publicId: 'delve/users/u1/avatars/pic',
        resourceType: 'image',
        format: 'png',
        bytes: 10,
        signature: 'x',
      }),
    ).rejects.toMatchObject({ code: 'INTENT_USED' })

    vi.mocked(prisma.mediaUploadIntent.findUnique).mockResolvedValue({
      id: 'intent1',
      userId: 'u1',
      purpose: 'avatar',
      expectedResourceType: 'image',
      maxBytes: 5_000_000,
      permittedFormats: ['png'],
      folder: 'delve/users/u1/avatars',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    await expect(
      completeUpload(env, 'u1', {
        uploadIntentId: 'intent1',
        publicId: 'delve/users/other/avatars/pic',
        resourceType: 'image',
        format: 'png',
        bytes: 10,
        signature: signCloudinaryParams({ upload_intent_id: 'intent1' }, env.CLOUDINARY_API_SECRET!),
      }),
    ).rejects.toMatchObject({ code: 'TAMPERED_METADATA' })

    await expect(
      completeUpload(env, 'u1', {
        uploadIntentId: 'intent1',
        publicId: 'delve/users/u1/avatars/pic',
        resourceType: 'image',
        format: 'png',
        bytes: 10,
        signature: 'not-valid',
      }),
    ).rejects.toMatchObject({ code: 'SIGNATURE_INVALID' })
  })

  it('verifies webhooks and ignores duplicates safely', async () => {
    const body = JSON.stringify({ public_id: 'delve/users/u1/avatars/pic' })
    const timestamp = '1710000000'
    const signature = sha1(body + timestamp + env.CLOUDINARY_API_SECRET!)
    expect(verifyCloudinaryNotification(body, timestamp, signature, env.CLOUDINARY_API_SECRET!)).toBe(true)

    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
      id: 'm1',
      status: 'PROCESSING',
    } as never)
    vi.mocked(prisma.mediaAsset.update).mockResolvedValue({} as never)
    await handleCloudinaryWebhook(env, body, timestamp, signature)
    await handleCloudinaryWebhook(env, body, timestamp, signature)
    expect(prisma.mediaAsset.update).toHaveBeenCalled()
  })

  it('deletes with ownership and reports Cloudinary failures', async () => {
    vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
      id: 'm1',
      uploadedByUserId: 'u1',
      publicId: 'delve/users/u1/avatars/pic',
      resourceType: 'image',
      purpose: 'avatar',
      deletedAt: null,
    } as never)
    vi.mocked(prisma.mediaAsset.update).mockResolvedValue({} as never)
    vi.mocked(prisma.travelerProfile.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)

    const out = await deleteMedia(env, 'u1', 'm1')
    expect(out.status).toBe('DELETED')

    vi.mocked(destroyCloudinaryAsset).mockResolvedValueOnce({ ok: false, result: 'error' })
    await expect(deleteMedia(env, 'u1', 'm1')).rejects.toMatchObject({ code: 'DELETION_FAILED' })
  })

  it('cleans expired intents', async () => {
    vi.mocked(prisma.mediaUploadIntent.updateMany).mockResolvedValue({ count: 3 })
    vi.mocked(prisma.mediaUploadIntent.deleteMany).mockResolvedValue({ count: 1 })
    const out = await cleanupMediaRecords(env)
    expect(out.expiredIntents).toBe(3)
  })
})

describe('media architecture enforcement', () => {
  it('keeps CLOUDINARY_API_SECRET out of frontend sources', () => {
    const root = join(process.cwd(), '../..')
    const targets = ['src', 'apps/admin-web/src']
    const hits: string[] = []

    function walk(dir: string) {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'dist') continue
        const full = join(dir, name)
        const st = statSync(full)
        if (st.isDirectory()) walk(full)
        else if (/\.(ts|tsx|js|jsx|css|html)$/.test(name)) {
          const text = readFileSync(full, 'utf8')
          if (text.includes('CLOUDINARY_API_SECRET')) hits.push(full)
        }
      }
    }

    for (const t of targets) walk(join(root, t))
    expect(hits).toEqual([])
  })

  it('MediaAsset Prisma model has no binary fields', () => {
    const schema = readFileSync(
      join(process.cwd(), '../../packages/database/prisma/schema.prisma'),
      'utf8',
    )
    const mediaBlock = schema.slice(schema.indexOf('model MediaAsset'), schema.indexOf('model MediaUploadIntent'))
    expect(mediaBlock).not.toMatch(/Bytes|ByteA|Unsupported\("Binary/)
    expect(mediaBlock).toContain('publicId')
    expect(mediaBlock).toContain('cloudinaryAssetId')
  })

  it('Backend V2 media routes do not accept multipart upload bodies', () => {
    const routes = readFileSync(join(process.cwd(), 'src/modules/media/media.routes.ts'), 'utf8')
    expect(routes).toContain('upload-signature')
    expect(routes).not.toMatch(/\bmulter\b|upload\.single/)
    expect(routes).not.toMatch(/express-fileupload|busboy/)
  })
})
