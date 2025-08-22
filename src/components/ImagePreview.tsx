type Props = {
  before: Blob
  after: Blob
}

export default function ImagePreview({ before, after }: Props) {
  const beforeUrl = URL.createObjectURL(before)
  const afterUrl = URL.createObjectURL(after)
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

