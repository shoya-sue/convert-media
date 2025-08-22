import React from 'react'

type Props = {
  before: Blob
  after: Blob
}

export default function BeforeAfter({ before, after }: Props) {
  const beforeUrl = React.useMemo(() => URL.createObjectURL(before), [before])
  const afterUrl = React.useMemo(() => URL.createObjectURL(after), [after])
  const [pos, setPos] = React.useState(50)
  React.useEffect(() => () => { URL.revokeObjectURL(beforeUrl); URL.revokeObjectURL(afterUrl) }, [beforeUrl, afterUrl])

  return (
    <div className="ba">
      <div className="ba-container">
        <img src={beforeUrl} className="ba-img" alt="before" />
        <img src={afterUrl} className="ba-img ba-after" alt="after" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
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
        <div className="ba-label ba-label-left">Before</div>
        <div className="ba-label ba-label-right">After</div>
      </div>
    </div>
  )
}

