import React from 'react'

type Props = {
  before: Blob | File
  after: Blob | File
  originalSize?: number
  compressedSize?: number
}

export default function BeforeAfter({ before, after, originalSize, compressedSize }: Props) {
  const [beforeUrl, setBeforeUrl] = React.useState<string>('')
  const [afterUrl, setAfterUrl] = React.useState<string>('')
  const [pos, setPos] = React.useState(50)
  const [viewMode, setViewMode] = React.useState<'slider' | 'side-by-side'>('slider')
  
  React.useEffect(() => {
    const bUrl = URL.createObjectURL(before)
    const aUrl = URL.createObjectURL(after)
    setBeforeUrl(bUrl)
    setAfterUrl(aUrl)
    
    return () => {
      URL.revokeObjectURL(bUrl)
      URL.revokeObjectURL(aUrl)
    }
  }, [before, after])

  if (!beforeUrl || !afterUrl) {
    return <div className="ba">読み込み中...</div>
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const reduction = originalSize && compressedSize 
    ? Math.round((1 - compressedSize / originalSize) * 100)
    : 0

  return (
    <div className="ba">
      {/* 表示モード切り替えボタン */}
      <div className="controls" style={{ marginBottom: 16 }}>
        <div className="segment" role="group" aria-label="表示モード">
          <button 
            type="button" 
            aria-pressed={viewMode === 'slider'}
            onClick={() => setViewMode('slider')}
          >
            🔄 スライダー比較
          </button>
          <button 
            type="button" 
            aria-pressed={viewMode === 'side-by-side'}
            onClick={() => setViewMode('side-by-side')}
          >
            📷 左右並列表示
          </button>
        </div>
        {originalSize && compressedSize && (
          <div className="badge badge--ok">
            {formatSize(originalSize)} → {formatSize(compressedSize)} 
            {reduction > 0 && ` (-${reduction}%)`}
          </div>
        )}
      </div>

      {viewMode === 'slider' ? (
        <div className="ba-container">
          <img src={beforeUrl} className="ba-img" alt="圧縮前" />
          <img src={afterUrl} className="ba-img ba-after" alt="圧縮後" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
          <input
            className="ba-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pos}
            onChange={(e) => setPos(parseInt(e.target.value))}
            aria-label="比較スライダー"
          />
          <div className="ba-label ba-label-left">圧縮前</div>
          <div className="ba-label ba-label-right">圧縮後</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <figure className="card" style={{ padding: 8, margin: 0 }}>
            <img src={beforeUrl} style={{ width: '100%', borderRadius: 8, display: 'block' }} alt="圧縮前" />
            <figcaption style={{ textAlign: 'center', marginTop: 8 }}>
              <strong>圧縮前</strong>
              {originalSize && <div className="muted">{formatSize(originalSize)}</div>}
            </figcaption>
          </figure>
          <figure className="card" style={{ padding: 8, margin: 0 }}>
            <img src={afterUrl} style={{ width: '100%', borderRadius: 8, display: 'block' }} alt="圧縮後" />
            <figcaption style={{ textAlign: 'center', marginTop: 8 }}>
              <strong>圧縮後</strong>
              {compressedSize && (
                <div className="muted">
                  {formatSize(compressedSize)}
                  {reduction > 0 && <span style={{ color: '#4CAF50' }}> (-{reduction}%)</span>}
                </div>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}

