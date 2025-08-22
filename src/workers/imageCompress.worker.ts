export type CompressTask = {
  id: string
  name: string
  type: string
  data: ArrayBuffer
  params: { format: 'auto' | 'jpeg' | 'png' | 'webp'; quality?: number; avoidUpsize?: boolean }
}

export type WorkerMsg =
  | { type: 'progress'; id: string; progress: number }
  | { type: 'done'; id: string; name: string; data: ArrayBuffer; bytes: number; usedOriginal: boolean }
  | { type: 'error'; id: string; error: string }

self.onmessage = async (e: MessageEvent<CompressTask>) => {
  const t = e.data
  try {
    postMessage({ type: 'progress', id: t.id, progress: 0 } as WorkerMsg)

    const fileBytes = t.data.byteLength
    const res = await compressInWorker(t)
    postMessage({
      type: 'done',
      id: t.id,
      name: t.name,
      data: await res.blob.arrayBuffer(),
      bytes: res.bytes,
      usedOriginal: res.usedOriginal,
    } as WorkerMsg, { transfer: [await res.blob.arrayBuffer()] as any })
  } catch (err: any) {
    postMessage({ type: 'error', id: t.id, error: String(err?.message ?? err) } as WorkerMsg)
  }
}

async function compressInWorker(task: CompressTask) {
  const blob = new Blob([task.data], { type: task.type })
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)

  const q = clamp01(task.params.quality ?? 0.88)
  const inputType = task.type
  const auto = task.params.format === 'auto'
  const candidates: { type: string; quality?: number }[] = []

  if (auto) {
    const alpha = await hasAlpha(canvas)
    if (inputType === 'image/png') {
      if (alpha) {
        candidates.push({ type: 'image/webp', quality: q })
        candidates.push({ type: 'image/png' })
      } else {
        candidates.push({ type: 'image/jpeg', quality: Math.max(0.7, q) })
        candidates.push({ type: 'image/webp', quality: q })
      }
    } else if (inputType === 'image/jpeg') {
      candidates.push({ type: 'image/jpeg', quality: q })
      candidates.push({ type: 'image/webp', quality: q })
    } else if (inputType === 'image/webp') {
      candidates.push({ type: 'image/webp', quality: q })
    } else {
      candidates.push({ type: 'image/webp', quality: q })
      candidates.push({ type: 'image/jpeg', quality: q })
    }
  } else {
    const t = pickTargetType(inputType, task.params.format)
    candidates.push({ type: t, quality: t === 'image/jpeg' || t === 'image/webp' ? q : undefined })
  }

  const originalBytes = blob.size
  let best = await encodeOne(canvas, candidates[0])
  // 品質調整
  if ((best.type === 'image/jpeg' || best.type === 'image/webp') && best.bytes >= originalBytes) {
    let step = (candidates[0].quality ?? q) - 0.05
    while (step >= 0.4) {
      const b = await canvasToBlob(canvas, best.type, step)
      if (b.size < best.bytes) best = { blob: b, type: best.type, bytes: b.size, quality: step }
      if (b.size < originalBytes) break
      step -= 0.05
    }
  }
  // 他候補も試してより小さいものを選択
  for (let i = 1; i < candidates.length; i++) {
    const enc = await encodeOne(canvas, candidates[i])
    if (enc.bytes < best.bytes) best = enc
  }

  const avoidUpsize = task.params.avoidUpsize ?? true
  if (avoidUpsize && best.bytes >= originalBytes) {
    return { blob, type: inputType, bytes: originalBytes, usedOriginal: true }
  }
  return { ...best, usedOriginal: false }
}

function pickTargetType(inputType: string, format: 'auto' | 'jpeg' | 'png' | 'webp') {
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

async function encodeOne(canvas: OffscreenCanvas, c: { type: string; quality?: number }) {
  const blob = await canvasToBlob(canvas, c.type, c.quality)
  return { blob, type: c.type, bytes: blob.size, quality: c.quality }
}

function canvasToBlob(canvas: OffscreenCanvas, type: string, quality?: number): Promise<Blob> {
  const anyCanvas: any = canvas as any
  if (typeof anyCanvas.convertToBlob === 'function') {
    return anyCanvas.convertToBlob({ type, quality: type === 'image/jpeg' || type === 'image/webp' ? quality : undefined })
  }
  // Fallback path is not expected in Worker; but keep to be safe
  return new Promise((resolve, reject) => reject(new Error('convertToBlob is not supported')))
}

async function hasAlpha(canvas: OffscreenCanvas): Promise<boolean> {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width as number
  const h = canvas.height as number
  const step = Math.max(1, Math.floor(Math.min(w, h) / 200))
  const data = ctx.getImageData(0, 0, w, h).data
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4 + 3
      if (data[i] < 255) return true
    }
  }
  return false
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }

