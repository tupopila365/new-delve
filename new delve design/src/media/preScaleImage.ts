/**
 * Client-Side Image Pre-scaling Utility.
 * Uses the native createImageBitmap API and off-screen canvas to downsample
 * large photos off the main thread before loading them into interactive editors,
 * preventing browser memory ballooning and Out-Of-Memory (OOM) tab crashes.
 */

/**
 * Calculates scaled dimensions constraining width and height to maxDimension
 * while strictly preserving the original aspect ratio.
 */
function calculateScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number,
): { width: number; height: number; scaled: boolean } {
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: srcWidth, height: srcHeight, scaled: false }
  }

  const aspectRatio = srcWidth / srcHeight
  if (aspectRatio > 1) {
    // Landscape orientation: constrain width
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(maxDimension / aspectRatio)),
      scaled: true,
    }
  } else {
    // Portrait or square orientation: constrain height
    return {
      width: Math.max(1, Math.round(maxDimension * aspectRatio)),
      height: maxDimension,
      scaled: true,
    }
  }
}

/**
 * Downscales large image files before feeding them into HTML5 canvases or state.
 *
 * @param file - Raw input image File object
 * @param maxDimension - Maximum allowed width or height in pixels (default: 2048)
 * @returns Downscaled File object or original file if within bounds
 */
export const preScaleImage = async (
  file: File,
  maxDimension = 2048,
): Promise<File | Blob> => {
  // Non-image files or vector SVGs pass through unaltered
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  // Verify createImageBitmap is available
  if (typeof createImageBitmap !== 'function') {
    console.warn('[preScaleImage] createImageBitmap is not supported in this environment, skipping pre-scaling.')
    return file
  }

  let bitmap: ImageBitmap | null = null

  try {
    // 1. Decode image off the main thread with createImageBitmap (very low memory footprint)
    bitmap = await createImageBitmap(file)

    const { width, height, scaled } = calculateScaledDimensions(
      bitmap.width,
      bitmap.height,
      maxDimension,
    )

    // If image is already smaller than maxDimension, return original file immediately
    if (!scaled) {
      return file
    }

    const outputMime = 'image/jpeg'
    const outputQuality = 0.85
    const outputFileName = `pre-scaled-${file.name.replace(/\.[^/.]+$/, '')}.jpg`

    // Strategy A: Modern OffscreenCanvas (Runs fully off main thread if supported)
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(width, height)
      const ctx = offscreen.getContext('2d', { alpha: false })

      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bitmap, 0, 0, width, height)

        const blob = await offscreen.convertToBlob({
          type: outputMime,
          quality: outputQuality,
        })

        return new File([blob], outputFileName, {
          type: outputMime,
          lastModified: Date.now(),
        })
      }
    }

    // Strategy B: Standard off-screen HTML5 Canvas
    return await new Promise<File | Blob>((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) {
        reject(new Error('Failed to acquire 2D context from off-screen canvas'))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap!, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob conversion returned null'))
            return
          }

          const scaledFile = new File([blob], outputFileName, {
            type: outputMime,
            lastModified: Date.now(),
          })

          resolve(scaledFile)
        },
        outputMime,
        outputQuality,
      )
    })
  } catch (err) {
    console.warn('[preScaleImage] Pre-scaling failed, falling back to original file:', err)
    return file
  } finally {
    // CRITICAL: Always close the ImageBitmap immediately to release GPU/RAM buffer
    if (bitmap) {
      bitmap.close()
    }
  }
}

export default preScaleImage
