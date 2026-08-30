-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EventCollaboratorRole" AS ENUM ('HOST', 'CO_HOST', 'EDITOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "EventCollaborator" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EventCollaboratorRole" NOT NULL DEFAULT 'CO_HOST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventCollaborator" ADD CONSTRAINT "EventCollaborator_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventCollaborator_eventId_userId_key" ON "EventCollaborator"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "EventCollaborator_userId_idx" ON "EventCollaborator"("userId");
CREATE INDEX IF NOT EXISTS "EventCollaborator_eventId_idx" ON "EventCollaborator"("eventId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "EventCollaborator" ADD CONSTRAINT "EventCollaborator_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventCollaborator" ADD CONSTRAINT "EventCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;
