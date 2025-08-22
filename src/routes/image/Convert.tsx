import { useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { convertImageFile } from '../../lib/image'
import { zipBlobs } from '../../lib/zip'
import ImagePreview from '../../components/ImagePreview'
import { useState as useReactState } from 'react'

export default function ImageConvert() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([])

  const schema = useMemo(
    () =>
      z.object({
        target: z.enum(['jpeg', 'png', 'webp']).default('webp'),
        quality: z.number().min(0).max(1).default(0.8),
      }),
    []
  )
  type FormValues = z.infer<typeof schema>
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target: 'webp', quality: 0.9 },
  })

  const onProcess = handleSubmit(async (values) => {
    setResults([])
    setProgress(0)
    const out: { name: string; blob: Blob }[] = []
    const useSquoosh = await isSquooshAvailable()
    if (useSquoosh) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const res = await runSquooshWorkerOnce(f, { target: values.target, quality: values.quality })
        const name = buildOutputName(f.name, values)
        out.push({ name, blob: new Blob([res.data], { type: res.mime }) })
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    } else {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const blob = await convertImageFile(f, values)
        const name = buildOutputName(f.name, values)
        out.push({ name, blob })
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
    }
    setResults(out)
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
        <h1>画像 変換</h1>
        <p className="muted">おすすめプリセットで簡単に形式変換。詳細設定で品質も調整できます。</p>
        <div className="controls">
          <PresetButtons onSelect={(q) => setValue('quality', q, { shouldDirty: true })} current={watch('quality') ?? 0.9} />
        </div>
        <Dropzone accept="image/*" onFiles={setFiles} files={files} />
        <form className="controls" onSubmit={onProcess}>
          <div className="controls">
            <div className="field">
              <div className="field-label">出力形式</div>
              <select className="select" {...register('target')}>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG（可逆）</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            <div className="field">
              <div className="field-label">品質: {Math.round((watch('quality') ?? 0.8) * 100)}</div>
              <input className="range" type="range" min={0} max={1} step={0.01} {...register('quality', { valueAsNumber: true })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!files.length}>変換開始</button>
        </form>
        <ProgressBar value={progress} />
      </div>
      {!!results.length && (
        <div className="card">
          <h3>結果</h3>
          <ul>
            {results.map((r) => (
              <li key={r.name}>
                {r.name} <DownloadLink name={r.name} blob={r.blob} />
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
    </div>
  )
}

function buildOutputName(input: string, p: { target: 'jpeg' | 'png' | 'webp'; quality: number }) {
  const dot = input.lastIndexOf('.')
  const base = dot >= 0 ? input.slice(0, dot) : input
  return `${base}_conv_q${Math.round(p.quality * 100)}.${p.target}`
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
  const presets = [
    { key: 'small', label: '軽量（小さく）', q: 0.7 },
    { key: 'balanced', label: 'バランス', q: 0.9 },
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

async function isSquooshAvailable() {
  try {
    const res = await fetch('/wasm/squoosh/init.mjs', { method: 'HEAD' })
    return res.ok
  } catch { return false }
}

async function runSquooshWorkerOnce(file: File, params: { target: 'jpeg'|'png'|'webp'; quality: number }) {
  const id = crypto.randomUUID()
  const data = await file.arrayBuffer()
  const worker = new Worker(new URL('../../workers/imageSquoosh.worker.ts', import.meta.url), { type: 'module' })
  const payload = { id, name: file.name, type: file.type, data, params: { target: params.target, quality: params.quality, effort: 4 } }
  return new Promise<{ data: ArrayBuffer; bytes: number; mime: string }>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.type === 'done' && e.data?.id === id) { worker.terminate(); resolve({ data: e.data.data, bytes: e.data.bytes, mime: e.data.mime }) }
      if (e.data?.type === 'error' && e.data?.id === id) { worker.terminate(); reject(new Error(e.data.error)) }
    }
    worker.postMessage(payload, { transfer: [data] })
  })
}
