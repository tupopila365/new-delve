import { useCallback, useEffect, useRef, useState } from 'react'
import type { Area } from 'react-easy-crop'
import { blobToAvatarFile, cropImageToAvatarBlob } from './avatarCropUtils'

type CropState = {
  src: string
  fileName: string
}

export type AvatarPhotoEditorState = {
  previewSrc: string | null
  pendingFile: File | null
  removeOnSave: boolean
  cropOpen: boolean
  cropSrc: string | null
  cropZoom: number
  cropPosition: { x: number; y: number }
  croppedAreaPixels: Area | null
  inputRef: React.RefObject<HTMLInputElement | null>
  setCropZoom: (value: number) => void
  setCropPosition: (value: { x: number; y: number }) => void
  onCropComplete: (_: Area, areaPixels: Area) => void
  openPicker: () => void
  onFileSelected: (file: File | null) => void
  confirmCrop: () => Promise<File | null>
  cancelCrop: () => void
  clearPending: () => void
  markRemove: () => void
}

export function useAvatarPhotoEditor(currentAvatarSrc: string | null | undefined): AvatarPhotoEditorState {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [removeOnSave, setRemoveOnSave] = useState(false)
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    }
  }, [pendingPreview])

  useEffect(() => {
    return () => {
      if (cropState?.src) URL.revokeObjectURL(cropState.src)
    }
  }, [cropState])

  const previewSrc = pendingPreview || currentAvatarSrc || null

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onFileSelected = useCallback((file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const src = URL.createObjectURL(file)
    setCropZoom(1)
    setCropPosition({ x: 0, y: 0 })
    setCroppedAreaPixels(null)
    setCropState({ src, fileName: file.name })
  }, [])

  const cancelCrop = useCallback(() => {
    setCropState((prev) => {
      if (prev?.src) URL.revokeObjectURL(prev.src)
      return null
    })
    setCroppedAreaPixels(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const confirmCrop = useCallback(async (): Promise<File | null> => {
    if (!cropState?.src || !croppedAreaPixels) return null
    const blob = await cropImageToAvatarBlob(cropState.src, croppedAreaPixels)
    const file = blobToAvatarFile(blob, cropState.fileName.replace(/\.\w+$/, '') + '.jpg')
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
    setRemoveOnSave(false)
    cancelCrop()
    return file
  }, [cancelCrop, cropState, croppedAreaPixels, pendingPreview])

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setRemoveOnSave(false)
    if (inputRef.current) inputRef.current.value = ''
  }, [pendingPreview])

  const markRemove = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setRemoveOnSave(true)
    if (inputRef.current) inputRef.current.value = ''
  }, [pendingPreview])

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  return {
    previewSrc: removeOnSave ? null : previewSrc,
    pendingFile,
    removeOnSave,
    cropOpen: Boolean(cropState),
    cropSrc: cropState?.src ?? null,
    cropZoom,
    cropPosition,
    croppedAreaPixels,
    inputRef,
    setCropZoom,
    setCropPosition,
    onCropComplete,
    openPicker,
    onFileSelected,
    confirmCrop,
    cancelCrop,
    clearPending,
    markRemove,
  }
}
