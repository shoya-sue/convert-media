import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { compressImageFile } from '../../lib/image'
import { zipBlobs } from '../../lib/zip'

export default function ImageCompress() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([])

  const schema = useMemo(
    () =>
      z.object({
        format: z.enum(['auto', 'jpeg', 'png', 'webp']).default('auto'),
        quality: z.number().min(0).max(1).default(0.75),
      }),
    []
  )
  type FormValues = z.infer<typeof schema>
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { format: 'auto', quality: 0.75 },
  })

  const onProcess = handleSubmit(async (values) => {
    setResults([])
    setProgress(0)
    const out: { name: string; blob: Blob }[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const blob = await compressImageFile(f, values)
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
        <h1>画像 圧縮</h1>
        <p className="muted">初心者でも簡単：おすすめプリセットを選ぶだけでOK。細かい調整は「詳細設定」で変更できます。</p>
        <div className="controls">
          <PresetButtons onSelect={(q) => setValue('quality', q, { shouldDirty: true })} current={watch('quality') ?? 0.75} />
        </div>
        <Dropzone accept="image/*" onFiles={setFiles} files={files} />
        <form className="controls" onSubmit={onProcess}>
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
                <div className="field-label">品質: {Math.round((watch('quality') ?? 0.75) * 100)}</div>
                <input className="range" type="range" min={0} max={1} step={0.01} {...register('quality', { valueAsNumber: true })} />
              </div>
            </div>
          </details>
          <button className="btn btn-primary" type="submit" disabled={!files.length}>処理開始</button>
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
                {r.name}{' '}
                <DownloadLink name={r.name} blob={r.blob} />
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={onDownloadAll}>すべてZIPでダウンロード</button>
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
    { key: 'small', label: '軽量（小さく）', q: 0.6 },
    { key: 'balanced', label: 'バランス', q: 0.75 },
    { key: 'high', label: '高画質（大きめ）', q: 0.9 },
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
