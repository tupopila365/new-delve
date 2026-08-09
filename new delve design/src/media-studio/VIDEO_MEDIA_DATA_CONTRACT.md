# Video Media Data Contract

Backend remains authoritative for upload limits, codecs, processing, music licences, moderation, and final media URLs. This document describes the client edit contract used by Delve Media Studio. Do not invent API endpoints from this file.

## Media asset

| Field | Type | Notes |
|-------|------|-------|
| id | string | Client or server id |
| ownerId | string | Account owner |
| context | StudioContext | Publishing / evidence context |
| mediaType | MediaKind | image, video, mixed, commercial, evidence, verification |
| source | enum | device, camera, record, draft, business-library |
| fileName | string | Original filename |
| mimeType | string | Declared mime |
| fileSize | number | Bytes |
| width / height | number | Pixels when known |
| duration | number | Seconds for video |
| orientation | enum | portrait, landscape, square |
| uploadStatus | UploadStatus | Selecting → ready / failure states |
| processingStatus | ProcessingStage | Upload and transcode stages |
| moderationStatus | enum | none → ready / restricted / blocked |
| createdAt / updatedAt | ISO string | |

## Video edit

| Field | Notes |
|-------|-------|
| sourceAssetId | Source media |
| aspectRatio | original, 9:16, 4:5, 1:1, 16:9, 3:2, listing |
| crop | zoom, offsetX/Y, rotation, fit |
| rotation | 0 / 90 / 180 / 270 |
| trimStart / trimEnd | Seconds |
| playbackSpeed | When enabled by context |
| adjustments | brightness, contrast, saturation, warmth, highlights, shadows, fade, sharpness |
| filter | Restrained filter id |
| clips[] | Ordered timeline clips |
| transitions[] | none / cut / crossfade / fades when enabled |
| cover | time, customUrl, altText, source |
| originalAudio | keep, muted, volume, fadeIn, fadeOut |
| music | Licensed track edit or null |
| captions[] | Automatic or manual segments |
| textOverlays[] | Social contexts only |

## Clip

id, sourceAssetId, sourceStart, sourceEnd, timelineStart, duration, order

## Music

trackId, source, licenceType, commercialUseAllowed, regionalAvailability, attribution, trimStart, trimEnd, timelineStart, volume, fadeIn, fadeOut

## Caption

id, language, source, start, end, text, confidence, reviewed, style

## Processing

uploadProgress, processingStage, processingProgress, retryable, failureReason, outputAssetId, previewUrls, notificationWhenReady

## Publishing

context, caption, location, linkedJourneyId, linkedCommunityId, linkedDealId, linkedListingId, visibility, commentsEnabled, sharingEnabled, disclosure, status

## Authoritative backend concerns

- Upload limits and accepted formats/codecs
- Duration and resolution requirements
- Transcoding and preview generation
- Automatic captions
- Music library, licences, commercial-use, regional availability
- Moderation outcomes
- Publishing permissions
- Final media URLs

Client prototypes may simulate progress and catalogue examples, but must not present invented rights, codecs, or moderation scores as production truth.
