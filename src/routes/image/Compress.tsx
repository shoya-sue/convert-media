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
  const { register, handleSubmit, watch } = useForm<FormValues>({
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
    <div>
      <h1>画像 圧縮</h1>
      <Dropzone accept="image/*" onFiles={setFiles} />
      <form className="controls" onSubmit={onProcess}>
        <label>
          出力形式
          <select {...register('format')}>
            <option value="auto">auto</option>
            <option value="jpeg">jpeg</option>
            <option value="png">png</option>
            <option value="webp">webp</option>
          </select>
        </label>
        <label style={{ marginLeft: 12 }}>
          品質 ({Math.round((watch('quality') ?? 0.75) * 100)})
          <input type="range" min={0} max={1} step={0.01} {...register('quality', { valueAsNumber: true })} />
        </label>
        <button type="submit" disabled={!files.length} style={{ marginLeft: 12 }}>
          処理開始
        </button>
      </form>
      <ProgressBar value={progress} />
      <List files={files} />
      {!!results.length && (
        <div style={{ marginTop: 12 }}>
          <h3>結果</h3>
          <ul>
            {results.map((r) => (
              <li key={r.name}>
                {r.name}{' '}
                <DownloadLink name={r.name} blob={r.blob} />
              </li>
            ))}
          </ul>
          <button onClick={onDownloadAll}>すべてZIPでダウンロード</button>
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
