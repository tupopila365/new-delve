import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __delvePrisma: PrismaClient | undefined
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

/** Shared client accessor for apps that opt in after Checkpoint 2. */
export const prisma: PrismaClient = globalThis.__delvePrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__delvePrisma = prisma
}

export type { PrismaClient } from '@prisma/client'
