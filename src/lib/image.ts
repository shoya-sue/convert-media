export type ImageCompressParams = {
  format: 'auto' | 'jpeg' | 'png' | 'webp'
  quality?: number // 0..1 (jpeg/webp)
  avoidUpsize?: boolean // true: 出力が大きくなる場合は原本を返す
}

export type CompressResult = {
  blob: Blob
  type: string
  bytes: number
  usedOriginal: boolean
}

export async function compressImageFile(file: File, params: ImageCompressParams): Promise<CompressResult> {
  const img = await loadImage(URL.createObjectURL(file))
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const q = params.quality ?? 0.75
  const inputType = file.type
  const auto = params.format === 'auto'
  const candidates: { type: string; quality?: number }[] = []

  if (auto) {
    const alpha = await hasAlpha(canvas)
    if (inputType === 'image/png') {
      if (alpha) {
        candidates.push({ type: 'image/webp', quality: clamp01(q) })
        candidates.push({ type: 'image/png' })
      } else {
        candidates.push({ type: 'image/jpeg', quality: clamp01(Math.max(0.6, q)) })
        candidates.push({ type: 'image/webp', quality: clamp01(q) })
      }
    } else if (inputType === 'image/jpeg') {
      candidates.push({ type: 'image/jpeg', quality: clamp01(q) })
      candidates.push({ type: 'image/webp', quality: clamp01(q) })
    } else if (inputType === 'image/webp') {
      candidates.push({ type: 'image/webp', quality: clamp01(q) })
      // 透過がなければjpeg比較
      const alpha2 = await hasAlpha(canvas)
      if (!alpha2) candidates.push({ type: 'image/jpeg', quality: clamp01(q) })
    } else {
      // その他は無難にwebp/jpeg候補
      candidates.push({ type: 'image/webp', quality: clamp01(q) })
      candidates.push({ type: 'image/jpeg', quality: clamp01(q) })
    }
  } else {
    const t = pickTargetType(inputType, params.format)
    candidates.push({ type: t, quality: t === 'image/jpeg' || t === 'image/webp' ? clamp01(q) : undefined })
  }

  const encodedList: { blob: Blob; type: string; bytes: number; quality?: number }[] = []
  for (const c of candidates) {
    const blob = await canvasToBlob(canvas, c.type, c.quality)
    encodedList.push({ blob, type: c.type, bytes: blob.size, quality: c.quality })
  }

  // 品質調整: 最初の候補が原本より大きければ段階的に品質を下げる（下限0.4）
  const originalBytes = file.size
  if (encodedList.length > 0 && encodedList[0].bytes >= originalBytes && (encodedList[0].type === 'image/jpeg' || encodedList[0].type === 'image/webp')) {
    let qStep = (encodedList[0].quality ?? q) - 0.05
    while (qStep >= 0.4) {
      const b = await canvasToBlob(canvas, encodedList[0].type, qStep)
      if (b.size < encodedList[0].bytes) {
        encodedList[0] = { blob: b, type: encodedList[0].type, bytes: b.size, quality: qStep }
        if (b.size < originalBytes) break
      }
      qStep -= 0.05
    }
  }

  // 最小サイズを選択
  let best = encodedList.sort((a, b) => a.bytes - b.bytes)[0]
  if (!best) {
    URL.revokeObjectURL(img.src)
    return { blob: file, type: inputType, bytes: file.size, usedOriginal: true }
  }
  const avoidUpsize = params.avoidUpsize ?? true
  if (avoidUpsize && best.bytes >= originalBytes) {
    URL.revokeObjectURL(img.src)
    return { blob: file, type: inputType, bytes: file.size, usedOriginal: true }
  }

  URL.revokeObjectURL(img.src)
  return { blob: best.blob, type: best.type, bytes: best.bytes, usedOriginal: false }
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

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const q = type === 'image/jpeg' || type === 'image/webp' ? quality : undefined
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type as any, q as any)
  })
}

async function hasAlpha(canvas: HTMLCanvasElement): Promise<boolean> {
  const ctx = canvas.getContext('2d')!
  const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 200)) // サンプリング密度
  const w = canvas.width
  const h = canvas.height
  const data = ctx.getImageData(0, 0, w, h).data
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4 + 3
      if (data[i] < 255) return true
    }
  }
  return false
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
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
