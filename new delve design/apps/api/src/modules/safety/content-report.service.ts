import { prisma } from '@delve/database'
import type { CreateContentReportBody, CreateContentReportResult } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'

const THANKS = 'Thanks for your report. Our team will review it.'
const OPEN = ['OPEN', 'UNDER_REVIEW'] as const

async function snapshotFor(targetType: CreateContentReportBody['targetType'], targetId: string) {
  if (targetType === 'POST') {
    const post = await prisma.post.findFirst({
      where: { id: targetId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, caption: true },
    })
    if (!post) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    return (post.caption || '').slice(0, 500)
  }
  if (targetType === 'EVENT') {
    const event = await prisma.travelerEvent.findFirst({
      where: { id: targetId, status: { not: 'DRAFT' } },
      select: { id: true, title: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    return (event.title || '').slice(0, 500)
  }
  if (targetType === 'JOURNEY') {
    const journey = await prisma.journey.findFirst({
      where: { id: targetId, deletedAt: null, visibility: { not: 'DRAFT' } },
      select: { id: true, title: true },
    })
    if (!journey) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    return (journey.title || '').slice(0, 500)
  }
  const comment = await prisma.comment.findFirst({
    where: { id: targetId, deletedAt: null },
    select: { id: true, body: true, post: { select: { status: true, deletedAt: true } } },
  })
  if (!comment || comment.post.status !== 'PUBLISHED' || comment.post.deletedAt) {
    throw new AppError(404, 'NOT_FOUND', 'Content not found.')
  }
  return (comment.body || '').slice(0, 500)
}

export async function createContentReport(
  reporterId: string,
  body: CreateContentReportBody,
): Promise<CreateContentReportResult> {
  const targetId = body.targetId.trim()
  if (!targetId) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid content.')

  const snapshot = await snapshotFor(body.targetType, targetId)

  const existingOpen = await prisma.contentReport.findFirst({
    where: {
      reporterId,
      targetType: body.targetType,
      targetId,
      status: { in: [...OPEN] },
    },
    select: { id: true },
  })
  if (existingOpen) {
    throw new AppError(409, 'REPORT_EXISTS', 'You have already reported this content.')
  }

  await prisma.contentReport.create({
    data: {
      reporterId,
      targetType: body.targetType,
      targetId,
      reason: body.reason,
      details: body.details?.trim() || null,
      reportedTextSnapshot: snapshot || null,
    },
  })
  return { message: THANKS }
}
