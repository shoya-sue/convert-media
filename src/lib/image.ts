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

export type ImageConvertParams = { target: 'jpeg' | 'png' | 'webp'; quality?: number }
export async function convertImageFile(file: File, params: ImageConvertParams): Promise<Blob> {
  const img = await loadImage(URL.createObjectURL(file))
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const type = params.target === 'jpeg' ? 'image/jpeg' : params.target === 'png' ? 'image/png' : 'image/webp'
  const quality = params.quality ?? (params.target === 'png' ? undefined : 0.8)
  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality as any)
  })
  URL.revokeObjectURL(img.src)
  return out
}

export type ImageResizeParams = {
  longEdge: number
  format: 'auto' | 'jpeg' | 'png' | 'webp'
  quality?: number
}
export async function resizeImageFile(file: File, params: ImageResizeParams): Promise<Blob> {
  const img = await loadImage(URL.createObjectURL(file))
  const { width, height } = scaleToLongEdge(img.naturalWidth, img.naturalHeight, params.longEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  const targetType = pickTargetType(file.type, params.format)
  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      targetType,
      targetType === 'image/jpeg' || targetType === 'image/webp' ? params.quality ?? 0.8 : undefined,
    )
  })
  URL.revokeObjectURL(img.src)
  return out
}

function scaleToLongEdge(w: number, h: number, long: number) {
  if (w >= h) {
    const ratio = long / w
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
  } else {
    const ratio = long / h
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
  }
}
