import { useCallback, useEffect, useState } from 'react'
import type { MediaKind, VideoTrim } from './types'
import { appendPostVideoToFormData, isFullVideoTrim, MAX_TRIM_DURATION_SEC, prepareVideoForUpload } from './videoTrimUtils'

export const POST_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'

export function usePostVideoMedia(initialKind: MediaKind = 'image') {
  const [mediaKind, setMediaKindState] = useState<MediaKind>(initialKind)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState<VideoTrim>({ start: 0, end: 0 })

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const onPickFile = useCallback((nextFile: File | null) => {
    setFile(nextFile)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextFile ? URL.createObjectURL(nextFile) : null
    })
    setVideoDuration(0)
    setVideoTrim({ start: 0, end: 0 })
  }, [])

  const setMediaKind = useCallback(
    (kind: MediaKind) => {
      setMediaKindState(kind)
      onPickFile(null)
    },
    [onPickFile],
  )

  const trimExceedsMax =
    mediaKind === 'video' && videoDuration > 0 && videoTrim.end - videoTrim.start > MAX_TRIM_DURATION_SEC

  const needsVideoPrepare =
    mediaKind === 'video' && file !== null && !isFullVideoTrim(videoTrim, videoDuration)

  const resolveVideoForUpload = useCallback(async (): Promise<File> => {
    if (!file) throw new Error('Add a video first.')
    return prepareVideoForUpload(file, videoTrim, videoDuration)
  }, [file, videoTrim, videoDuration])

  const appendVideoToFormData = useCallback(
    async (fd: FormData, key = 'video') => {
      if (!file) throw new Error('Add a video first.')
      await appendPostVideoToFormData(fd, file, videoTrim, videoDuration, key)
    },
    [file, videoTrim, videoDuration],
  )

  return {
    mediaKind,
    setMediaKind,
    file,
    preview,
    videoDuration,
    setVideoDuration,
    videoTrim,
    setVideoTrim,
    onPickFile,
    videoAccept: POST_VIDEO_ACCEPT,
    trimExceedsMax,
    needsVideoPrepare,
    resolveVideoForUpload,
    appendVideoToFormData,
    canSubmitVideo: !trimExceedsMax,
  }
}
