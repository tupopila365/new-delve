-- Phase 6: community notification types for join requests / replies.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_JOIN_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_JOIN_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_THREAD_REPLY';
