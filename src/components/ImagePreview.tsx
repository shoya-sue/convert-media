import React from 'react'

type Props = {
  before: Blob | File
  after: Blob | File
}

export default function ImagePreview({ before, after }: Props) {
  const [beforeUrl, setBeforeUrl] = React.useState<string>('')
  const [afterUrl, setAfterUrl] = React.useState<string>('')
  
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
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <figure className="card" style={{ padding: 8 }}>
        <img src={beforeUrl} style={{ maxWidth: '100%', borderRadius: 8 }} />
        <figcaption className="muted">変換前</figcaption>
      </figure>
      <figure className="card" style={{ padding: 8 }}>
        <img src={afterUrl} style={{ maxWidth: '100%', borderRadius: 8 }} />
        <figcaption className="muted">変換後</figcaption>
      </figure>
    </div>
  )
}

