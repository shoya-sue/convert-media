export type ImageCompressParams = {
  format: 'auto' | 'jpeg' | 'png' | 'webp'
  quality?: number // 0..1 (jpeg/webp)
}

export async function compressImageFile(file: File, params: ImageCompressParams): Promise<Blob> {
  const blob = file
  const img = await loadImage(URL.createObjectURL(blob))
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const targetType = pickTargetType(file.type, params.format)
  const quality = params.quality ?? 0.75
  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      targetType,
      targetType === 'image/jpeg' || targetType === 'image/webp' ? quality : undefined,
    )
  })
  URL.revokeObjectURL(img.src)
  return out
}

function pickTargetType(inputType: string, format: ImageCompressParams['format']) {
  if (format === 'auto') return inputType
  switch (format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

