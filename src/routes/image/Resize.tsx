import { useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { resizeImageFile } from '../../lib/image'
import { zipBlobs } from '../../lib/zip'
import ImagePreview from '../../components/ImagePreview'

export default function ImageResize() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([])

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
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { longEdge: 1920, format: 'auto', quality: 0.8 },
  })

  const onProcess = handleSubmit(async (values) => {
    setResults([])
    setProgress(0)
    const out: { name: string; blob: Blob }[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const blob = await resizeImageFile(f, values)
      const name = buildOutputName(f.name, values)
      out.push({ name, blob })
      setProgress(Math.round(((i + 1) / files.length) * 100))
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
        <h1>画像 リサイズ</h1>
        <p className="muted">用途に合わせたサイズをプリセットで選んで簡単リサイズ。</p>
        <div className="controls">
          <SizePresets onSelect={(px) => setValue('longEdge', px, { shouldDirty: true })} current={watch('longEdge') ?? 1920} />
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
