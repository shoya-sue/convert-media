export type VideoOptions = {
  target: 'mp4' | 'webm'
  crf: number
  preset?: string
  maxLongEdge?: number | null
  fpsCap?: number | null
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/wasm/ffmpeg/ffmpeg-core.js', { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

export async function transcodeVideo(
  file: File,
  opts: VideoOptions,
  onProgress?: (ratio: number) => void,
): Promise<{ data: ArrayBuffer; bytes: number; mime: string; name: string }> {
  const id = crypto.randomUUID()
  const data = await file.arrayBuffer()
  const worker = new Worker(new URL('../workers/videoFfmpeg.worker.ts', import.meta.url), { type: 'module' })
  const params = {
    crf: opts.crf,
    preset: opts.preset ?? 'medium',
    maxLongEdge: opts.maxLongEdge ?? null,
    fpsCap: opts.fpsCap ?? null,
    target: opts.target,
  }
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.type === 'progress' && e.data?.id === id && onProgress) onProgress(e.data.ratio)
      if (e.data?.type === 'done' && e.data?.id === id) {
        worker.terminate()
        resolve({ data: e.data.data, bytes: e.data.bytes, mime: e.data.mime, name: e.data.name })
      }
      if (e.data?.type === 'error' && e.data?.id === id) {
        worker.terminate()
        reject(new Error(e.data.error))
      }
    }
    worker.postMessage({ id, name: file.name, type: file.type, data, params }, { transfer: [data] })
  })
}

export async function createVideoThumbnail(file: File, atSec = 0.5): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    const onCleanup = () => URL.revokeObjectURL(url)
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(atSec, (video.duration || 1) - 0.1)
      } catch {
        // ignore
      }
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      const w = video.videoWidth
      const h = video.videoHeight
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, w, h)
      canvas.toBlob((b) => {
        onCleanup()
        if (b) resolve(b)
        else reject(new Error('thumbnail toBlob failed'))
      }, 'image/jpeg', 0.85)
    }
    video.onerror = (e) => { onCleanup(); reject(new Error('video load error')) }
  })
}

export async function createVideoThumbnails(file: File, fractions: number[]): Promise<Blob[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.src = url
  video.crossOrigin = 'anonymous'
  video.muted = true
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error('video load error'))
  })
  const duration = Math.max(0.1, video.duration || 1)
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  const blobs: Blob[] = []
  for (const f of fractions) {
    const t = Math.min(duration - 0.05, Math.max(0, f) * duration)
    await new Promise<void>((resolve) => {
      const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve() }
      video.addEventListener('seeked', onSeek)
      try { video.currentTime = t } catch { resolve() }
    })
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const b = await new Promise<Blob>((res, rej) => canvas.toBlob((bb)=> bb? res(bb): rej(new Error('toBlob failed')), 'image/jpeg', 0.85))
    blobs.push(b)
  }
  URL.revokeObjectURL(url)
  return blobs
}
