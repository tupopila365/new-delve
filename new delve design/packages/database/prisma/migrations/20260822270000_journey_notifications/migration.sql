-- Phase 6: journey notification types for likes and comments.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOURNEY_LIKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOURNEY_COMMENTED';
