import { useState } from 'react'
import Dropzone from '../../components/Dropzone'
import ProgressBar from '../../components/ProgressBar'

export default function VideoCompress() {
  const [files, setFiles] = useState<File[]>([])
  const [progress] = useState(0)
  const [crf, setCrf] = useState(23)

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
        <Dropzone accept="video/*" onFiles={setFiles} files={files} />
        <div className="controls">
          <button className="btn btn-primary" disabled>圧縮開始（近日対応）</button>
        </div>
        <ProgressBar value={progress} />
      </div>
    </div>
  )
}
