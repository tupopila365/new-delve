-- 1. Create JourneyStatus & JourneyCollaboratorRole enums safely
DO $$ BEGIN
  CREATE TYPE "JourneyStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JourneyCollaboratorRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Alter Journey table
ALTER TABLE "Journey" 
  ADD COLUMN IF NOT EXISTS "status" "JourneyStatus" NOT NULL DEFAULT 'PLANNING',
  ADD COLUMN IF NOT EXISTS "isOngoing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "clonedFromId" TEXT,
  ALTER COLUMN "durationDays" DROP NOT NULL;

-- 3. Add Foreign Key for ClonedFrom
DO $$ BEGIN
  ALTER TABLE "Journey" 
    ADD CONSTRAINT "Journey_clonedFromId_fkey" 
    FOREIGN KEY ("clonedFromId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create JourneyCollaborator table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "JourneyCollaborator" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "JourneyCollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "JourneyCollaborator" ADD CONSTRAINT "JourneyCollaborator_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "JourneyCollaborator" ADD CONSTRAINT "JourneyCollaborator_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "JourneyCollaborator" ADD CONSTRAINT "JourneyCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- 5. Create Indices
CREATE UNIQUE INDEX IF NOT EXISTS "JourneyCollaborator_journeyId_userId_key" ON "JourneyCollaborator"("journeyId", "userId");
CREATE INDEX IF NOT EXISTS "JourneyCollaborator_userId_idx" ON "JourneyCollaborator"("userId");
CREATE INDEX IF NOT EXISTS "JourneyCollaborator_journeyId_idx" ON "JourneyCollaborator"("journeyId");
CREATE INDEX IF NOT EXISTS "Journey_clonedFromId_idx" ON "Journey"("clonedFromId");
CREATE INDEX IF NOT EXISTS "Journey_status_startDate_idx" ON "Journey"("status", "startDate");
