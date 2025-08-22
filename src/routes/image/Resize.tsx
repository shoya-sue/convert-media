import Dropzone from '../../components/Dropzone'

export default function ImageResize() {
  return (
    <div>
      <h1>画像 リサイズ</h1>
      <Dropzone accept="image/*" onFiles={() => {}} />
      <p>ここにリサイズ設定フォーム（長辺/フィットなど）を配置します。</p>
    </div>
  )
}

