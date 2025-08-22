// 旧ダミー実装を削除
import { useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isFfmpegAvailable, transcodeVideo } from '../../lib/video'

export default function VideoConvert() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([])
  const [available, setAvailable] = useState<boolean | null>(null)

  if (available === null) isFfmpegAvailable().then(setAvailable).catch(() => setAvailable(false))

  const schema = useMemo(() => z.object({
    target: z.enum(['mp4','webm']).default('mp4'),
    crf: z.number().int().min(18).max(40).default(23),
  }), [])
  type FormValues = z.infer<typeof schema>
  const { register, handleSubmit, watch } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { target: 'mp4', crf: 23 } })

  const onStart = handleSubmit(async (v) => {
    setRunning(true)
    setProgress(0)
    const out: { name: string; blob: Blob }[] = []
    for (let i=0;i<files.length;i++){
      const f = files[i]
      const res = await transcodeVideo(f, { target: v.target, crf: v.crf, preset: 'medium' }, (r) => setProgress(Math.round(r*100)))
      const name = f.name.replace(/\.[^.]+$/, '') + (v.target === 'mp4' ? '.mp4' : '.webm')
      out.push({ name, blob: new Blob([res.data], { type: res.mime }) })
    }
    setResults(out)
    setProgress(100)
    setRunning(false)
  })

  return (
    <div className="stack">
      <div className="card">
        <h1>動画 変換</h1>
        <div className="controls">
          <div className="field">
            <div className="field-label">出力形式</div>
            <select className="select" {...register('target')}>
              <option value="mp4">MP4 (H.264/AAC)</option>
              <option value="webm">WEBM (VP9/Opus)</option>
            </select>
          </div>
          <div className="field">
            <div className="field-label">品質(CRF): {watch('crf')}</div>
            <input className="range" type="range" min={18} max={36} step={1} {...register('crf', { valueAsNumber: true })} />
          </div>
        </div>
        <Dropzone accept="video/*" onFiles={setFiles} files={files} />
        <div className="controls">
          <button className="btn btn-primary" disabled={!files.length || running || available === false} onClick={onStart}>
            {available === false ? 'ffmpeg未配置（無効）' : running ? '処理中...' : '変換開始'}
          </button>
        </div>
        <ProgressBar value={progress} />
        {!!results.length && (
          <div className="card">
            <h3>結果</h3>
            <ul>
              {results.map((r) => (
                <li key={r.name}>{r.name} <a href={URL.createObjectURL(r.blob)} download={r.name}>ダウンロード</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
