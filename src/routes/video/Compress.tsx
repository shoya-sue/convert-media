import { useEffect, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { createVideoThumbnail, createVideoThumbnails } from '../../lib/video'
import { loadNumber, saveNumber } from '../../lib/persist'

export default function VideoCompress() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [crf, setCrf] = useState(loadNumber('form:video:compress:crf', 23))
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{ name: string; blob: Blob; info?: string }[]>([])
  const [thumb, setThumb] = useState<Blob | null>(null)
  const [thumbs, setThumbs] = useState<Blob[]>([])
  const [thumbPos, setThumbPos] = useState(loadNumber('form:video:compress:thumbPos', 50))
  useEffect(()=>{ saveNumber('form:video:compress:crf', crf) },[crf])
  useEffect(()=>{ saveNumber('form:video:compress:thumbPos', thumbPos) },[thumbPos])
  const [available, setAvailable] = useState<boolean | null>(null)

  // Detect ffmpeg core availability once
  if (available === null) {
    fetch('/wasm/ffmpeg/ffmpeg-core.js', { method: 'HEAD' })
      .then((r) => setAvailable(r.ok))
      .catch(() => setAvailable(false))
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>動画 圧縮</h1>
        <p className="muted">プリセット（軽量/バランス/高画質）で簡単に。詳細は後日WASM対応予定。</p>
        <div className="controls">
          <div className="segment" role="group" aria-label="品質プリセット">
            <button type="button" aria-pressed={crf >= 26} onClick={() => setCrf(28)}>軽量</button>
            <button type="button" aria-pressed={crf === 23} onClick={() => setCrf(23)}>バランス</button>
            <button type="button" aria-pressed={crf <= 20} onClick={() => setCrf(20)}>高画質</button>
          </div>
          <div className="field">
            <div className="field-label">CRF: {crf}</div>
            <input className="range" type="range" min={18} max={30} step={1} value={crf} onChange={(e) => setCrf(parseInt(e.target.value))} />
          </div>
        </div>
        <Dropzone accept="video/*" onFiles={async (fs)=>{ setFiles(fs); setThumbs([]); if (fs.length===1){ try{ setThumb(await createVideoThumbnail(fs[0], 0.01 + (thumbPos/100))) } catch{ setThumb(null) } } }} files={files} />
        <div className="controls">
          <button className="btn btn-primary" disabled={!files.length || running || available === false} onClick={() => onStart(files, crf, setProgress, setRunning, setResults)}>
            {available === false ? 'ffmpeg未配置（無効）' : running ? '処理中...' : '圧縮開始'}
          </button>
        </div>
        <ProgressBar value={progress} />
        {!!results.length && (
          <div className="card">
            <h3>結果</h3>
            <ul>
              {results.map((r) => (
                <li key={r.name}>
                  {r.name} {r.info && <span className="badge badge--ok">{r.info}</span>} <a href={URL.createObjectURL(r.blob)} download={r.name}>ダウンロード</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(thumb || thumbs.length) && (
          <div className="card">
            <h3>プレビュー</h3>
            <div className="controls">
              <div className="field">
                <div className="field-label">サムネ位置: {thumbPos}%</div>
                <input className="range" type="range" min={0} max={100} step={1} value={thumbPos} onChange={(e)=> setThumbPos(parseInt(e.target.value))} />
              </div>
              <button className="btn" onClick={async ()=> { if (files.length===1){ try{ setThumb(await createVideoThumbnail(files[0], (thumbPos/100))) } catch{} } }}>更新</button>
              <button className="btn btn-ghost" onClick={async ()=> { if (files.length===1){ try{ setThumbs(await createVideoThumbnails(files[0],[0.2,0.5,0.8])) } catch{} } }}>3枚作成</button>
            </div>
            {thumb && <img src={URL.createObjectURL(thumb)} style={{ maxWidth: '100%', borderRadius: 8 }} />}
            {thumbs.length>0 && (
              <div className="controls" style={{ gap: 8 }}>
                {thumbs.map((t,i)=> <img key={i} src={URL.createObjectURL(t)} style={{ width: '32%', borderRadius: 8 }} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

async function onStart(files: File[], crf: number, setProgress: (n: number) => void, setRunning: (b: boolean) => void, setResults: (r: { name: string; blob: Blob; info?: string }[]) => void) {
  setRunning(true)
  setProgress(0)
  const out: { name: string; blob: Blob; info?: string }[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const res = await runVideoWorkerOnce(f, { crf, preset: 'medium', maxLongEdge: null, fpsCap: null }, (ratio) => setProgress(Math.round(ratio * 100)))
    const blob = new Blob([res.data], { type: res.mime })
    const info = `${(f.size/1024/1024).toFixed(2)}MB → ${(blob.size/1024/1024).toFixed(2)}MB（-${Math.max(0, Math.round((1 - blob.size / f.size)*100))}%）`
    out.push({ name: f.name.replace(/\.[^.]+$/, '') + '_cmp.mp4', blob, info })
  }
  setResults(out)
  setProgress(100)
  setRunning(false)
}

async function runVideoWorkerOnce(file: File, params: { crf: number; preset: string; maxLongEdge: number | null; fpsCap: number | null }, onProgress: (r: number) => void) {
  const id = crypto.randomUUID()
  const data = await file.arrayBuffer()
  const worker = new Worker(new URL('../../workers/videoFfmpeg.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<{ data: ArrayBuffer; bytes: number; mime: string }>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.type === 'progress' && e.data?.id === id) onProgress(e.data.ratio)
      if (e.data?.type === 'done' && e.data?.id === id) { worker.terminate(); resolve({ data: e.data.data, bytes: e.data.bytes, mime: e.data.mime }) }
      if (e.data?.type === 'error' && e.data?.id === id) { worker.terminate(); reject(new Error(e.data.error)) }
    }
    worker.postMessage({ id, name: file.name, type: file.type, data, params }, { transfer: [data] })
  })
}
