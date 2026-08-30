import { prisma } from '@delve/database'
import type { Env } from '../config/env.js'
import { destroyCloudinaryAsset } from '../modules/media/cloudinary.js'
import { recordMediaMetric } from '../modules/media/metrics.js'

const BATCH_SIZE = 25
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

let timer: ReturnType<typeof setTimeout> | null = null
let running = false

/**
 * Sweeps abandoned upload drafts older than 24 hours and purges partial media from Cloudinary and PostgreSQL.
 */
export async function purgeAbandonedDrafts(
  env: Env,
  maxAgeHours = 24,
): Promise<{ purgedSessions: number; purgedAssets: number }> {
  if (!env.cloudinaryConfigured) {
    return { purgedSessions: 0, purgedAssets: 0 }
  }

  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
  let purgedSessions = 0
  let purgedAssets = 0

  try {
    // 1. Find PENDING sessions created before cutoff
    const abandonedSessions = await prisma.mediaUploadSession.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: cutoff },
      },
      include: {
        mediaAssets: {
          select: {
            id: true,
            publicId: true,
            resourceType: true,
            status: true,
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    })

    if (!abandonedSessions.length) {
      return { purgedSessions: 0, purgedAssets: 0 }
    }

    for (const session of abandonedSessions) {
      // 2. Destroy uploaded media from Cloudinary
      for (const asset of session.mediaAssets) {
        if (asset.status !== 'DELETED') {
          const resType = asset.resourceType === 'video' ? 'video' : asset.resourceType === 'raw' ? 'raw' : 'image'
          try {
            await destroyCloudinaryAsset(env, asset.publicId, resType)
            purgedAssets++
          } catch (cldErr) {
            console.warn(`[draft-cleanup] Warning deleting asset ${asset.publicId}:`, cldErr)
          }
        }
      }

      // 3. Mark session as ABANDONED and clean up assets in DB
      await prisma.$transaction(async tx => {
        await tx.mediaAsset.updateMany({
          where: { draftId: session.id },
          data: { status: 'DELETED', deletedAt: new Date() },
        })
        await tx.mediaUploadSession.update({
          where: { id: session.id },
          data: { status: 'ABANDONED' },
        })
      })

      purgedSessions++
    }

    recordMediaMetric('draft_cleanup_executed', {
      purgedSessions,
      purgedAssets,
    })
  } catch (err) {
    console.error('[draft-cleanup-job] Error executing draft cleanup:', err)
  }

  return { purgedSessions, purgedAssets }
}

/**
 * Starts background scheduler for daily draft sweeper.
 */
export function startDraftCleanupScheduler(env: Env): () => void {
  if (!env.cloudinaryConfigured) return () => undefined

  const tick = async () => {
    if (running) return
    running = true
    try {
      await purgeAbandonedDrafts(env, 24)
    } catch (err) {
      console.error('[draft-cleanup-scheduler]', err instanceof Error ? err.message : 'run failed')
    } finally {
      running = false
      timer = setTimeout(() => void tick(), SWEEP_INTERVAL_MS)
      timer.unref()
    }
  }

  timer = setTimeout(() => void tick(), SWEEP_INTERVAL_MS)
  timer.unref()
  return () => {
    if (timer) clearTimeout(timer)
  }
}
