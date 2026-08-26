import { prisma } from '@delve/database'
import type { CreateContentReportBody, CreateContentReportResult } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'

const THANKS = 'Thanks for your report. Our team will review it.'

export async function createContentReport(
  reporterId: string,
  body: CreateContentReportBody,
): Promise<CreateContentReportResult> {
  const targetId = body.targetId.trim()
  if (!targetId) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid content.')

  if (body.targetType === 'POST') {
    const post = await prisma.post.findFirst({
      where: { id: targetId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    })
    if (!post) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
  } else if (body.targetType === 'EVENT') {
    const event = await prisma.travelerEvent.findFirst({
      where: { id: targetId, status: { not: 'DRAFT' } },
      select: { id: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
  } else {
    const journey = await prisma.journey.findFirst({
      where: { id: targetId, deletedAt: null, visibility: { not: 'DRAFT' } },
      select: { id: true },
    })
    if (!journey) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
  }

  const existing = await prisma.contentReport.findUnique({
    where: {
      reporterId_targetType_targetId: {
        reporterId,
        targetType: body.targetType,
        targetId,
      },
    },
  })
  if (existing) {
    if (existing.status === 'OPEN' || existing.status === 'UNDER_REVIEW') {
      throw new AppError(409, 'REPORT_EXISTS', 'You have already reported this content.')
    }
    throw new AppError(409, 'REPORT_EXISTS', 'You have already reported this content.')
  }

  await prisma.contentReport.create({
    data: {
      reporterId,
      targetType: body.targetType,
      targetId,
      reason: body.reason,
      details: body.details?.trim() || null,
    },
  })
  return { message: THANKS }
}
