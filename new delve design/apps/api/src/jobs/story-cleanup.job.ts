import { prisma } from '@delve/database'
import type { Env } from '../config/env.js'
import { destroyCloudinaryAsset } from '../modules/media/cloudinary.js'
import { recordMediaMetric } from '../modules/media/metrics.js'

const BATCH_SIZE = 50
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

let timer: ReturnType<typeof setTimeout> | null = null
let running = false

/**
 * Sweeps expired 24h stories, purges media binaries from Cloudinary, and deletes database records.
 */
export async function runStoryCleanup(env: Env): Promise<{ expiredStories: number; destroyedAssets: number }> {
  if (!env.cloudinaryConfigured) {
    return { expiredStories: 0, destroyedAssets: 0 }
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let destroyedAssets = 0
  let expiredStories = 0

  try {
    // 1. Find story slides or story media created before cutoff that haven't been deleted yet
    const expiredMedia = await prisma.mediaAsset.findMany({
      where: {
        purpose: 'story',
        createdAt: { lte: cutoff },
        status: { notIn: ['DELETED', 'DELETION_PENDING'] },
      },
      select: {
        id: true,
        publicId: true,
        resourceType: true,
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    })

    if (!expiredMedia.length) {
      return { expiredStories: 0, destroyedAssets: 0 }
    }

    for (const asset of expiredMedia) {
      const resType = asset.resourceType === 'video' ? 'video' : asset.resourceType === 'raw' ? 'raw' : 'image'
      try {
        const destroyed = await destroyCloudinaryAsset(env, asset.publicId, resType)
        if (!destroyed.ok && destroyed.result !== 'not found') {
          recordMediaMetric('deletion_failed', { category: destroyed.result || 'story_cron_cleanup' })
          continue
        }

        await prisma.$transaction(async tx => {
          await tx.mediaAsset.update({
            where: { id: asset.id },
            data: { status: 'DELETED', deletedAt: new Date() },
          })
        })
        destroyedAssets++
      } catch (err) {
        console.error(`[story-cleanup] Failed destroying asset ${asset.publicId}:`, err)
      }
    }

    // 2. Also cleanup storySlide records if present
    try {
      const deletedSlides = await prisma.storySlide.updateMany({
        where: {
          expiresAt: { lte: new Date() },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      })
      expiredStories = deletedSlides.count
    } catch {
      // storySlide table optional
    }

    recordMediaMetric('story_cleanup_executed', {
      destroyedAssets,
      expiredStories,
    })
  } catch (err) {
    console.error('[story-cleanup-job] Error executing story cleanup:', err)
  }

  return { expiredStories, destroyedAssets }
}

/**
 * Starts background scheduler for hourly story purging.
 */
export function startStoryCleanupScheduler(env: Env): () => void {
  if (!env.cloudinaryConfigured) return () => undefined

  const tick = async () => {
    if (running) return
    running = true
    try {
      await runStoryCleanup(env)
    } catch (err) {
      console.error('[story-cleanup-scheduler]', err instanceof Error ? err.message : 'run failed')
    } finally {
      running = false
      timer = setTimeout(() => void tick(), CLEANUP_INTERVAL_MS)
      timer.unref()
    }
  }

  timer = setTimeout(() => void tick(), CLEANUP_INTERVAL_MS)
  timer.unref()
  return () => {
    if (timer) clearTimeout(timer)
  }
}
