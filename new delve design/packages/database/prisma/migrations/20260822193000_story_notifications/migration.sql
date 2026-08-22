-- Delvers stories hardening: notification type for follower story alerts
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STORY_FROM_FOLLOWED';
