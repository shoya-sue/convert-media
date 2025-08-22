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

