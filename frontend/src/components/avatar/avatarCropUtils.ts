import type { Area } from 'react-easy-crop'

const OUTPUT_SIZE = 512

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Could not load image')))
    image.src = src
  })
}

export async function cropImageToAvatarBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare crop canvas')

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not export cropped image'))
      },
      'image/jpeg',
      0.88,
    )
  })
}

export function blobToAvatarFile(blob: Blob, filename = 'avatar.jpg'): File {
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}
