import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { compressImageFile } from '../../lib/image'
import { zipBlobs } from '../../lib/zip'
import BeforeAfter from '../../components/BeforeAfter'
import { loadJSON, saveJSON } from '../../lib/persist'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export default function ImageCompress() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ name: string; blob: Blob; info?: string; reduction?: number; orig?: number; out?: number }[]>([])
  const [squooshAvail, setSquooshAvail] = useState<boolean | null>(null)
  useEffect(()=>{ (async()=>{ try{ const r=await fetch('/wasm/squoosh/init.mjs',{method:'HEAD'}); setSquooshAvail(r.ok) }catch{ setSquooshAvail(false) } })() },[])

  const schema = useMemo(
    () =>
      z.object({
        format: z.enum(['auto', 'jpeg', 'png', 'webp']).default('auto'),
        quality: z.number().min(0).max(1).default(0.88),
        effort: z.number().optional(),
        lossless: z.boolean().optional(),
        chroma: z.string().optional(),
      }),
    []
  )
  type FormValues = z.infer<typeof schema>
  const defaults: FormValues = loadJSON<FormValues>('form:image:compress', { format: 'auto', quality: 0.88 } as any)
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })
  useEffect(()=>{
    const sub = watch((v)=> { saveJSON('form:image:compress', v as any) })
    return () => sub.unsubscribe()
  },[watch])

  const processImages = async (values: any) => {
    setResults([])
    setProgress(0)
    const out: { name: string; blob: Blob; info: string; reduction: number; orig: number; out: number }[] = []
    const squooshReady = await isSquooshAvailable()
    const canWorker = 'Worker' in window && 'OffscreenCanvas' in window

    if (canWorker && squooshReady) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        try {
          const res = await runSquooshWorkerOnce(f, values)
          const name = buildOutputName(f.name, values)
          const info = `${(f.size/1024).toFixed(1)}KB → ${(res.bytes/1024).toFixed(1)}KB`
          const outBlob = new Blob([res.data], { type: res.mime })
          const reduction = Math.max(0, 1 - outBlob.size / f.size)
          out.push({ name, blob: outBlob, info, reduction, orig: f.size, out: outBlob.size })
        } catch (error) {
          // Squooshが失敗した場合、Canvas APIにフォールバック
          const res = await runWorkerOnce(f, values)
          const name = buildOutputName(f.name, values)
          const info = `${(f.size/1024).toFixed(1)}KB → ${(res.bytes/1024).toFixed(1)}KB${res.usedOriginal ? '（元のまま）' : ''}`
          const outBlob = new Blob([res.data], { type: res.type ?? f.type })
          const reduction = Math.max(0, 1 - outBlob.size / f.size)
          out.push({ name, blob: outBlob, info, reduction, orig: f.size, out: outBlob.size })
        }
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    } else if (canWorker) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const res = await runWorkerOnce(f, values)
        const name = buildOutputName(f.name, values)
        const info = `${(f.size/1024).toFixed(1)}KB → ${(res.bytes/1024).toFixed(1)}KB${res.usedOriginal ? '（元のまま）' : ''}`
        const outBlob = new Blob([res.data], { type: res.type ?? f.type })
        const reduction = Math.max(0, 1 - outBlob.size / f.size)
        out.push({ name, blob: outBlob, info, reduction, orig: f.size, out: outBlob.size })
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    } else {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const res = await compressImageFile(f, { ...values, avoidUpsize: true })
        const name = buildOutputName(f.name, values)
        const info = `${(f.size/1024).toFixed(1)}KB → ${(res.bytes/1024).toFixed(1)}KB${res.usedOriginal ? '（元のまま）' : ''}`
        const reduction = Math.max(0, 1 - res.blob.size / f.size)
        out.push({ name, blob: res.blob, info, reduction, orig: f.size, out: res.blob.size })
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    }
    // 削減率の高い順に並べ替え
    setResults(out.sort((a,b)=> (b.reduction ?? 0) - (a.reduction ?? 0)))
  }

  const onDownloadAll = async () => {
    const zip = await zipBlobs(results)
    const url = URL.createObjectURL(zip)
    const a = document.createElement('a')
    a.href = url
    a.download = 'images.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const [isProcessing, setIsProcessing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // キーボードショートカット
  useKeyboardShortcuts({
    onEnter: () => {
      if (files.length > 0 && !isProcessing) {
        formRef.current?.requestSubmit()
      }
    },
    onEscape: () => {
      if (!isProcessing) {
        setFiles([])
        setResults([])
        setProgress(0)
      }
    },
    onSave: () => {
      if (results.length > 0) {
        onDownloadAll()
      }
    },
    enabled: true,
  })

  // フォーム送信ハンドラー
  const onProcess = handleSubmit(async (values) => {
    setIsProcessing(true)
    try {
      await processImages(values)
    } finally {
      setIsProcessing(false)
    }
  })

  return (
    <div className="stack">
      <div className="card">
        <h1>画像 圧縮</h1>
        <p className="muted">初心者でも簡単：おすすめプリセットを選ぶだけでOK。細かい調整は「詳細設定」で変更できます。</p>
        <div className="controls">
          <PresetButtons onSelect={(q) => setValue('quality', q, { shouldDirty: true })} current={watch('quality') ?? 0.88} />
        </div>
        <Dropzone accept="image/*" onFiles={setFiles} files={files} />
        <form ref={formRef} className="controls" onSubmit={onProcess}>
          <details>
            <summary className="muted">詳細設定</summary>
            <div className="controls">
              <div className="field">
                <div className="field-label">出力形式</div>
                <select className="select" {...register('format')}>
                  <option value="auto">おすすめ（自動）</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div className="field">
                <div className="field-label">品質: {Math.round((watch('quality') ?? 0.88) * 100)}</div>
                <input className="range" type="range" min={0} max={1} step={0.01} {...register('quality', { valueAsNumber: true })} />
              </div>
              <div className="field">
                <div className="field-label">努力度(effort)</div>
                <select className="select" {...register('effort', { valueAsNumber: true })}>
                  {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <div className="help">高いほど時間がかかるが、サイズが小さく/画質が安定しやすい</div>
              </div>
              <div className="field">
                <label><input type="checkbox" {...register('lossless')} /> ロスレス優先（PNG/WebPのみ）</label>
                <div className="help">画質劣化なしの可逆圧縮。サイズは大きくなりやすい</div>
              </div>
              <div className="field">
                <div className="field-label">サブサンプリング（JPEG）</div>
                <select className="select" {...register('chroma')}>
                  <option value="420">4:2:0（既定）</option>
                  <option value="444">4:4:4（色優先）</option>
                </select>
                <div className="help">4:2:0は一般的・軽量、4:4:4は色優先で高品質（サイズ増）</div>
              </div>
            </div>
          </details>
          <button 
            className="btn btn-primary" 
            type="submit" 
            disabled={!files.length || isProcessing}
          >
            {isProcessing ? '処理中...' : '処理開始'}
          </button>
        </form>
        <ProgressBar value={progress} />
      </div>
      {/* 入力ファイルはDropzone内に表示する方針 */}
      {!!results.length && (
        <div className="card">
          <h3>結果</h3>
          <ul>
            {results.map((r) => (
              <li key={r.name}>
                {r.name} {r.info && (
                  <span title={`${((r.orig??0)/1024).toFixed(1)}KB → ${((r.out??0)/1024).toFixed(1)}KB`} className={`badge ${((r.reduction ?? 0) >= 0.5) ? 'badge--good' : ((r.reduction ?? 0) >= 0.2) ? 'badge--ok' : 'badge--low'}`}>{r.info}</span>
                )} <DownloadLink name={r.name} blob={r.blob} />
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={onDownloadAll}>すべてZIPでダウンロード</button>
        </div>
      )}
      {squooshAvail === false && (
        <div className="card">
          <p className="muted">高品質コーデック未配置のため標準エンジンで動作中です。<br/>`public/wasm/squoosh/` にWASM/JSを置くと自動的に高圧縮・高画質になります。</p>
        </div>
      )}
      {files.length === 1 && results.length === 1 && (
        <div className="card">
          <h3>プレビュー比較</h3>
          <BeforeAfter 
            before={files[0]} 
            after={results[0].blob} 
            originalSize={files[0].size}
            compressedSize={results[0].blob.size}
          />
        </div>
      )}
    </div>
  )
}

function List({ files }: { files: File[] }) {
  if (!files.length) return null
  return (
    <ul className="file-list">
      {files.map((f) => (
        <li key={f.name}>{f.name}</li>
      ))}
    </ul>
  )
}

function buildOutputName(input: string, p: { format: 'auto' | 'jpeg' | 'png' | 'webp'; quality: number }) {
  const dot = input.lastIndexOf('.')
  const base = dot >= 0 ? input.slice(0, dot) : input
  const ext = p.format === 'auto' ? (dot >= 0 ? input.slice(dot + 1) : 'jpg') : p.format
  return `${base}_cmp_q${Math.round(p.quality * 100)}.${ext}`
}

function DownloadLink({ name, blob }: { name: string; blob: Blob }) {
  const url = URL.createObjectURL(blob)
  return (
    <a href={url} download={name} onClick={() => setTimeout(() => URL.revokeObjectURL(url), 1000)}>
      ダウンロード
    </a>
  )
}

function PresetButtons({ onSelect, current }: { onSelect: (q: number) => void; current: number }) {
  // マッピング：初心者向けに「軽量」「バランス」「高画質」
  const presets = [
    { key: 'small', label: '軽量（小さく）', q: 0.7 },
    { key: 'balanced', label: 'バランス', q: 0.88 },
    { key: 'high', label: '最高品質', q: 0.98 },
  ]
  const nearest = presets.reduce((a, b) => (Math.abs(b.q - current) < Math.abs(a.q - current) ? b : a), presets[0])
  return (
    <div className="segment" role="group" aria-label="品質プリセット">
      {presets.map((p) => (
        <button type="button" key={p.key} aria-pressed={nearest.key === p.key} onClick={() => onSelect(p.q)}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

// RHFのsetValueを使うため、直接DOMを触るハックは不要

async function runWorkerOnce(file: File, params: { format: 'auto' | 'jpeg' | 'png' | 'webp'; quality: number }) {
  const id = crypto.randomUUID()
  const worker = new Worker(new URL('../../workers/imageCompress.worker.ts', import.meta.url), { type: 'module' })
  const data = await file.arrayBuffer()
  const payload = { id, name: file.name, type: file.type, data, params: { ...params, avoidUpsize: true } }
  return new Promise<{ data: ArrayBuffer; bytes: number; usedOriginal: boolean; type: string }>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.type === 'done' && e.data?.id === id) {
        worker.terminate()
        resolve({ data: e.data.data, bytes: e.data.bytes, usedOriginal: e.data.usedOriginal, type: file.type })
      } else if (e.data?.type === 'error' && e.data?.id === id) {
        worker.terminate()
        reject(new Error(e.data.error))
      }
    }
    worker.postMessage(payload, { transfer: [data] })
  })
}

async function runSquooshWorkerOnce(file: File, params: { format: 'auto' | 'jpeg' | 'png' | 'webp'; quality: number; effort?: number; lossless?: boolean; chroma?: '420'|'444' }) {
  const id = crypto.randomUUID()
  const data = await file.arrayBuffer()
  // format=auto は Squoosh 側では target 必須のため、推奨は webp か jpeg を選ぶ
  const target = params.format === 'png' ? 'png' : params.format === 'jpeg' ? 'jpeg' : 'webp'
  const worker = new Worker(new URL('../../workers/imageSquoosh.worker.ts', import.meta.url), { type: 'module' })
  const payload = { id, name: file.name, type: file.type, data, params: { target, quality: params.quality, effort: params.effort ?? 4, lossless: params.lossless ?? false, chroma: params.chroma ?? '420'  } }
  return new Promise<{ data: ArrayBuffer; bytes: number; mime: string }>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.type === 'done' && e.data?.id === id) {
        worker.terminate()
        resolve({ data: e.data.data, bytes: e.data.bytes, mime: e.data.mime })
      } else if (e.data?.type === 'error' && e.data?.id === id) {
        worker.terminate()
        reject(new Error(e.data.error))
      }
    }
    worker.postMessage(payload, { transfer: [data] })
  })
}

async function isSquooshAvailable() {
  // 現時点ではSquooshは利用不可として扱う（WASMファイルが配置されていないため）
  return false
  // 将来的にSquooshを有効にする場合は以下のコメントを解除
  // try {
  //   const res = await fetch('/wasm/squoosh/init.mjs', { method: 'HEAD' })
  //   return res.ok
  // } catch {
  //   return false
  // }
}
