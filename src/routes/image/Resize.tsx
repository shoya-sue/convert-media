import { useEffect, useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { resizeImageFile } from '../../lib/image'
import { zipBlobs } from '../../lib/zip'
import ImagePreview from '../../components/ImagePreview'
import { loadJSON, saveJSON } from '../../lib/persist'

export default function ImageResize() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ name: string; blob: Blob; info: string; reduction: number; orig?: number; out?: number }[]>([])
  const [squooshAvail, setSquooshAvail] = useState<boolean | null>(null)
  useEffect(()=>{ (async()=>{ try{ const r=await fetch('/wasm/squoosh/init.mjs',{method:'HEAD'}); setSquooshAvail(r.ok) }catch{ setSquooshAvail(false) } })() },[])

  const schema = useMemo(
    () =>
      z.object({
        longEdge: z.number().int().min(256).max(8192).default(1920),
        format: z.enum(['auto', 'jpeg', 'png', 'webp']).default('auto'),
        quality: z.number().min(0).max(1).default(0.8),
      }),
    []
  )
  type FormValues = z.infer<typeof schema>
  const defaults: FormValues = loadJSON<FormValues>('form:image:resize', { longEdge: 1920, format: 'auto', quality: 0.9, effort: 4, lossless: false, chroma: '420' } as any)
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })
  useEffect(()=>{
    const sub = watch((v)=> saveJSON('form:image:resize', v as any))
    return () => sub.unsubscribe()
  },[watch])

  const onProcess = handleSubmit(async (values) => {
    setResults([])
    setProgress(0)
    const out: { name: string; blob: Blob; info: string }[] = []
    const useSquoosh = await isSquooshAvailable()
    if (useSquoosh) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const res = await runSquooshWorkerOnce(f, { target: values.format === 'auto' ? 'jpeg' : values.format, quality: values.quality, maxLongEdge: values.longEdge })
        const name = buildOutputName(f.name, values)
        const outBlob = new Blob([res.data], { type: res.mime })
        const reduction = Math.max(0, 1 - outBlob.size / f.size)
        const info = `${(f.size/1024).toFixed(1)}KB → ${(outBlob.size/1024).toFixed(1)}KB（-${Math.round(reduction*100)}%）`
        out.push({ name, blob: outBlob, info, reduction, orig: f.size, out: outBlob.size })
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    } else {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const blob = await resizeImageFile(f, values)
        const name = buildOutputName(f.name, values)
        const reduction = Math.max(0, 1 - blob.size / f.size)
        const info = `${(f.size/1024).toFixed(1)}KB → ${(blob.size/1024).toFixed(1)}KB（-${Math.round(reduction*100)}%）`
        out.push({ name, blob, info, reduction, orig: f.size, out: blob.size })
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    }
    setResults(out.sort((a,b)=> (b.reduction ?? 0) - (a.reduction ?? 0)))
  })

  const onDownloadAll = async () => {
    const zip = await zipBlobs(results)
    const url = URL.createObjectURL(zip)
    const a = document.createElement('a')
    a.href = url
    a.download = 'images.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>画像 リサイズ</h1>
        <p className="muted">用途に合わせたサイズをプリセットで選んで簡単リサイズ。</p>
        <div className="controls">
          <SizePresets onSelect={(px) => setValue('longEdge', px, { shouldDirty: true })} current={watch('longEdge') ?? 1920} />
        </div>
          <div className="field">
            <div className="field-label">出力形式</div>
            <select className="select" {...register('format')}>
              <option value="auto">入力と同じ</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div className="field">
            <div className="field-label">品質: {Math.round((watch('quality') ?? 0.9) * 100)}</div>
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
        <Dropzone accept="image/*" onFiles={setFiles} files={files} />
        <form className="controls" onSubmit={onProcess}>
          <div className="controls">
            <div className="field">
              <div className="field-label">長辺: {watch('longEdge')} px</div>
              <input className="range" type="range" min={256} max={4096} step={64} {...register('longEdge', { valueAsNumber: true })} />
            </div>
            <div className="field">
              <div className="field-label">出力形式</div>
              <select className="select" {...register('format')}>
                <option value="auto">入力と同じ</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!files.length}>リサイズ開始</button>
        </form>
        <ProgressBar value={progress} />
      </div>
      {!!results.length && (
        <div className="card">
          <h3>結果</h3>
          <ul>
            {results.map((r) => (
              <li key={r.name}>
                {r.name} <span title={`${((r.orig??0)/1024).toFixed(1)}KB → ${((r.out??0)/1024).toFixed(1)}KB`} className={`badge ${((r.reduction ?? 0)>=0.5)?'badge--good':((r.reduction ?? 0)>=0.2)?'badge--ok':'badge--low'}`}>{r.info}</span> <DownloadLink name={r.name} blob={r.blob} />
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={onDownloadAll}>すべてZIPでダウンロード</button>
        </div>
      )}
      {files.length === 1 && results.length === 1 && (
        <div className="card">
          <h3>プレビュー</h3>
          <ImagePreview before={files[0]} after={results[0].blob} />
        </div>
      )}
      {squooshAvail === false && (
        <div className="card">
          <p className="muted">高品質コーデック未配置のため標準エンジンで動作中です。`public/wasm/squoosh/` にWASM/JSを置くと自動で高品質になります。</p>
        </div>
      )}
    </div>
  )
}

function buildOutputName(input: string, p: { format: 'auto' | 'jpeg' | 'png' | 'webp'; longEdge: number }) {
  const dot = input.lastIndexOf('.')
  const base = dot >= 0 ? input.slice(0, dot) : input
  const ext = p.format === 'auto' ? (dot >= 0 ? input.slice(dot + 1) : 'jpg') : p.format
  return `${base}_resize_${p.longEdge}.${ext}`
}

function DownloadLink({ name, blob }: { name: string; blob: Blob }) {
  const url = URL.createObjectURL(blob)
  return (
    <a href={url} download={name} onClick={() => setTimeout(() => URL.revokeObjectURL(url), 1000)}>
      ダウンロード
    </a>
  )
}

function SizePresets({ onSelect, current }: { onSelect: (px: number) => void; current: number }) {
  const presets = [
    { key: 'sm', label: '小（1280）', px: 1280 },
    { key: 'md', label: '中（1920）', px: 1920 },
    { key: 'lg', label: '大（2560）', px: 2560 },
  ]
  const nearest = presets.reduce((a, b) => (Math.abs(b.px - current) < Math.abs(a.px - current) ? b : a), presets[0])
  return (
    <div className="segment" role="group" aria-label="サイズプリセット">
      {presets.map((p) => (
        <button type="button" key={p.key} aria-pressed={nearest.key === p.key} onClick={() => onSelect(p.px)}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

async function isSquooshAvailable() { try { const r = await fetch('/wasm/squoosh/init.mjs', { method: 'HEAD' }); return r.ok } catch { return false } }

async function runSquooshWorkerOnce(file: File, params: { target: 'jpeg'|'png'|'webp'; quality: number; maxLongEdge: number }) {
  const id = crypto.randomUUID()
  const data = await file.arrayBuffer()
  const worker = new Worker(new URL('../../workers/imageSquoosh.worker.ts', import.meta.url), { type: 'module' })
  const payload = { id, name: file.name, type: file.type, data, params: { target: params.target, quality: params.quality, effort: 4, maxLongEdge: params.maxLongEdge } }
  return new Promise<{ data: ArrayBuffer; bytes: number; mime: string }>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.type === 'done' && e.data?.id === id) { worker.terminate(); resolve({ data: e.data.data, bytes: e.data.bytes, mime: e.data.mime }) }
      if (e.data?.type === 'error' && e.data?.id === id) { worker.terminate(); reject(new Error(e.data.error)) }
    }
    worker.postMessage(payload, { transfer: [data] })
  })
}
