import React from 'react'

type Props = {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
}

export default function Dropzone({ accept, multiple = true, onFiles }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setOver(false)
    const files = Array.from(e.dataTransfer.files)
    onFiles(files)
  }

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    onFiles(files)
  }

  return (
    <div
      className={`dropzone ${over ? 'over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onSelect}
        style={{ display: 'none' }}
      />
      <p>ファイルをドラッグ＆ドロップ、またはクリックして選択</p>
    </div>
  )
}

