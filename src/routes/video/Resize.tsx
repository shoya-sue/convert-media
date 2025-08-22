import Dropzone from '../../components/Dropzone'

export default function VideoResize() {
  return (
    <div>
      <h1>動画 リサイズ</h1>
      <Dropzone accept="video/*" onFiles={() => {}} />
      <p>ここにリサイズ設定フォーム（長辺指定など）を配置します。</p>
    </div>
  )
}

