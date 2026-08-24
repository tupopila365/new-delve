-- Journey stop media: track image vs video per URL

ALTER TABLE "JourneyStop" ADD COLUMN "mediaResourceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
