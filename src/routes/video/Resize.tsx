// 旧ダミー実装を削除
import { useEffect, useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'
import { createVideoThumbnail, createVideoThumbnails } from '../../lib/video'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isFfmpegAvailable, transcodeVideo } from '../../lib/video'
import { loadJSON, saveJSON, loadNumber, saveNumber } from '../../lib/persist'

export default function VideoResize() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([])
  const [thumb, setThumb] = useState<Blob | null>(null)
  const [thumbs, setThumbs] = useState<Blob[]>([])
  const [thumbPos, setThumbPos] = useState(50)
  const [available, setAvailable] = useState<boolean | null>(null)
  if (available === null) isFfmpegAvailable().then(setAvailable).catch(() => setAvailable(false))

  const schema = useMemo(() => z.object({
    long: z.number().int().min(480).max(3840).default(1280),
    crf: z.number().int().min(18).max(30).default(23),
  }), [])
  type FormValues = z.infer<typeof schema>
  const defaults: FormValues = loadJSON<FormValues>('form:video:resize', { long: 1280, crf: 23 } as any)
  const { register, handleSubmit, watch } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(()=>{ const sub = watch(v=> saveJSON('form:video:resize', v as any)); return ()=> sub.unsubscribe() },[watch])

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
        <Dropzone accept="video/*" onFiles={async (fs)=>{ setFiles(fs); setThumbs([]); if (fs.length===1){ try{ setThumb(await createVideoThumbnail(fs[0], (thumbPos/100))) } catch{ setThumb(null) } } }} files={files} />
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
            {thumb && (
              <div className="controls" style={{ alignItems: 'center', gap: 8 }}>
                <img src={URL.createObjectURL(thumb)} style={{ maxWidth: '60%', borderRadius: 8 }} />
                <a className="btn btn-ghost" href={URL.createObjectURL(thumb)} download={(files[0]?.name?.replace(/\.[^.]+$/, '')||'thumb')+`_${thumbPos}.jpg`}>サムネを保存</a>
              </div>
            )}
            {thumbs.length>0 && (
              <div className="controls" style={{ gap: 8 }}>
                {thumbs.map((t,i)=> (
                  <div key={i} style={{ width: '32%' }}>
                    <img src={URL.createObjectURL(t)} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                    <a className="btn btn-ghost" href={URL.createObjectURL(t)} download={(files[0]?.name?.replace(/\.[^.]+$/, '')||'thumb')+`_${i+1}.jpg`}>保存</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
