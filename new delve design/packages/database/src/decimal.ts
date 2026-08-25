import { Prisma } from '@prisma/client'

/** Prisma Decimal (commercial money math). Import this path so tests can mock `@delve/database` without dropping Decimal. */
export const Decimal = Prisma.Decimal
export type Decimal = Prisma.Decimal
