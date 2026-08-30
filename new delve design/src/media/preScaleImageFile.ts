export interface PreScaleOptions {
  /** Maximum width or height dimension in pixels. Defaults to 2048. */
  maxDimension?: number
  /** Compression quality between 0.0 and 1.0. Defaults to 0.88. */
  quality?: number
  /** Output MIME format. Defaults to 'image/jpeg'. */
  outputType?: 'image/webp' | 'image/jpeg'
}

/**
 * Calculates new dimensions while maintaining aspect ratio within max constraints.
 */
function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number,
): { width: number; height: number; scaled: boolean } {
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: srcWidth, height: srcHeight, scaled: false }
  }

  const aspectRatio = srcWidth / srcHeight
  if (aspectRatio > 1) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(maxDimension / aspectRatio)),
      scaled: true,
    }
  } else {
    return {
      width: Math.max(1, Math.round(maxDimension * aspectRatio)),
      height: maxDimension,
      scaled: true,
    }
  }
}

/**
 * Downsamples large raw image Files client-side to prevent Out-Of-Memory (OOM) tab crashes
 * when loaded into interactive HTML5 canvases.
 */
export async function preScaleImageFile(
  file: File,
  options: PreScaleOptions = {},
): Promise<File> {
  const { maxDimension = 2048, quality = 0.88, outputType = 'image/jpeg' } = options

  // Non-image files or vector SVGs pass through unaltered
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  try {
    // Strategy A: Modern OffscreenCanvas + ImageBitmap (Fastest & lowest memory overhead)
    if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined') {
      const bitmap = await createImageBitmap(file)
      const { width, height, scaled } = calculateTargetDimensions(
        bitmap.width,
        bitmap.height,
        maxDimension,
      )

      if (!scaled) {
        bitmap.close()
        return file
      }

      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) {
        bitmap.close()
        throw new Error('Failed to acquire OffscreenCanvas 2D context')
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close() // Immediately free raw decoded bitmap buffer from GPU/RAM

      const blob = await canvas.convertToBlob({ type: outputType, quality })
      const ext = outputType.split('/')[1] || 'jpg'
      const newName = file.name.replace(/\.[^/.]+$/, `.${ext}`)

      return new File([blob], newName, {
        type: outputType,
        lastModified: Date.now(),
      })
    }

    // Strategy B: Fallback HTML5 Canvas + Image element
    return await new Promise<File>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        URL.revokeObjectURL(url)
        const { width, height, scaled } = calculateTargetDimensions(
          img.naturalWidth,
          img.naturalHeight,
          maxDimension,
        )

        if (!scaled) {
          resolve(file)
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { alpha: false })

        if (!ctx) {
          reject(new Error('Failed to acquire canvas 2D context'))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas blob generation failed'))
              return
            }
            const ext = outputType.split('/')[1] || 'jpg'
            const newName = file.name.replace(/\.[^/.]+$/, `.${ext}`)
            resolve(
              new File([blob], newName, {
                type: outputType,
                lastModified: Date.now(),
              }),
            )
          },
          outputType,
          quality,
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not decode image file'))
      }

      img.src = url
    })
  } catch (err) {
    console.warn('[preScaleImageFile] Downsampling failed, using original file:', err)
    return file
  }
}
