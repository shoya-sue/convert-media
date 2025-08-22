// 旧ダミー実装を削除
import { useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { createVideoThumbnail } from '../../lib/video'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isFfmpegAvailable, transcodeVideo } from '../../lib/video'

export default function VideoResize() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([])
  const [thumb, setThumb] = useState<Blob | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  if (available === null) isFfmpegAvailable().then(setAvailable).catch(() => setAvailable(false))

  const schema = useMemo(() => z.object({
    long: z.number().int().min(480).max(3840).default(1280),
    crf: z.number().int().min(18).max(30).default(23),
  }), [])
  type FormValues = z.infer<typeof schema>
  const { register, handleSubmit, watch } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { long: 1280, crf: 23 } })

  const onStart = handleSubmit(async (v) => {
    setRunning(true)
    setProgress(0)
    const out: { name: string; blob: Blob }[] = []
    for (let i=0;i<files.length;i++){
      const f = files[i]
      const res = await transcodeVideo(f, { target: 'mp4', crf: v.crf, preset: 'medium', maxLongEdge: v.long }, (r)=> setProgress(Math.round(r*100)))
      const name = f.name.replace(/\.[^.]+$/, '') + '_resize.mp4'
      out.push({ name, blob: new Blob([res.data], { type: res.mime }) })
    }
    setResults(out)
    setProgress(100)
    setRunning(false)
  })

  return (
    <div className="stack">
      <div className="card">
        <h1>動画 リサイズ</h1>
        <div className="controls">
          <div className="field">
            <div className="field-label">長辺: {watch('long')} px</div>
            <input className="range" type="range" min={480} max={3840} step={40} {...register('long', { valueAsNumber: true })} />
          </div>
          <div className="field">
            <div className="field-label">品質(CRF): {watch('crf')}</div>
            <input className="range" type="range" min={18} max={30} step={1} {...register('crf', { valueAsNumber: true })} />
          </div>
        </div>
        <Dropzone accept="video/*" onFiles={async (fs)=>{ setFiles(fs); if (fs.length===1){ try{ setThumb(await createVideoThumbnail(fs[0])) } catch{ setThumb(null) } } }} files={files} />
        <div className="controls">
          <button className="btn btn-primary" disabled={!files.length || running || available === false} onClick={onStart}>
            {available === false ? 'ffmpeg未配置（無効）' : running ? '処理中...' : 'リサイズ開始'}
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
        {thumb && (
          <div className="card">
            <h3>プレビュー</h3>
            <img src={URL.createObjectURL(thumb)} style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}
      </div>
    </div>
  )
}
