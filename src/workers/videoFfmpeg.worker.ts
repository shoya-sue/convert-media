import * as FF from '@ffmpeg/ffmpeg'

export type VideoTask = {
  id: string
  name: string
  type: string
  data: ArrayBuffer
  params: { crf: number; preset: string; maxLongEdge?: number | null; fpsCap?: number | null; target?: 'mp4'|'webm' }
}

export type VideoMsg =
  | { type: 'progress'; id: string; ratio: number }
  | { type: 'done'; id: string; name: string; data: ArrayBuffer; bytes: number; mime: string }
  | { type: 'error'; id: string; error: string }

let ffmpeg: any = null
let durationSec: number | null = null

self.onmessage = async (e: MessageEvent<VideoTask>) => {
  const t = e.data
  try {
    if (!ffmpeg) {
      const { createFFmpeg } = FF as any
      ffmpeg = createFFmpeg({ corePath: '/wasm/ffmpeg/ffmpeg-core.js', log: true })
      ffmpeg.setLogger(({ message }) => {
        if (typeof message !== 'string') return
        // Duration: 00:01:23.45
        const d = message.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/)
        if (d && !durationSec) {
          const h = parseFloat(d[1]); const m = parseFloat(d[2]); const s = parseFloat(d[3])
          durationSec = h*3600 + m*60 + s
        }
        // time=00:00:12.34
        const m2 = message.match(/time=\s*(\d+):(\d+):(\d+\.?\d*)/)
        if (m2 && durationSec) {
          const h = parseFloat(m2[1]); const m = parseFloat(m2[2]); const s = parseFloat(m2[3])
          const cur = h*3600 + m*60 + s
          const ratio = Math.max(0, Math.min(0.99, cur / durationSec))
          self.postMessage({ type: 'progress', id: t.id, ratio } as VideoMsg)
        }
      })
      await ffmpeg.load()
    }
    ffmpeg.FS('writeFile', 'input', new Uint8Array(t.data))

    const vf: string[] = []
    if (t.params.maxLongEdge) {
      const L = t.params.maxLongEdge
      vf.push(`scale='if(gt(a,1),min(${L},iw),-2)':'if(gt(a,1),-2,min(${L},ih))'`)
    }
    const target = t.params.target ?? 'mp4'
    const args = [
      '-i', 'input',
      ...(vf.length ? ['-vf', vf.join(',')] : []),
      ...(t.params.fpsCap ? ['-r', String(t.params.fpsCap)] : []),
      ...(target === 'mp4'
        ? ['-c:v', 'libx264', '-crf', String(t.params.crf), '-preset', t.params.preset, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'output.mp4']
        : ['-c:v', 'libvpx-vp9', '-crf', String(Math.max(0, Math.min(63, t.params.crf + 9))), '-b:v', '0', '-c:a', 'libopus', '-b:a', '128k', 'output.webm']
      )
    ]
    await ffmpeg.run(...args)
    const outName = target === 'mp4' ? 'output.mp4' : 'output.webm'
    const out = ffmpeg.FS('readFile', outName)
    self.postMessage({ type: 'done', id: t.id, name: outName, data: out.buffer, bytes: out.length, mime: target === 'mp4' ? 'video/mp4' : 'video/webm' } as VideoMsg, { transfer: [out.buffer] })
  } catch (err: any) {
    self.postMessage({ type: 'error', id: t.id, error: String(err?.message ?? err) } as VideoMsg)
  }
}
