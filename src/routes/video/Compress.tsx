import Dropzone from '../../components/Dropzone'

export default function VideoCompress() {
  return (
    <div>
      <h1>動画 圧縮</h1>
      <Dropzone accept="video/*" onFiles={() => {}} />
      <p>ここに圧縮設定フォーム（CRF/プリセット/FPSなど）を配置します。</p>
    </div>
  )
}

