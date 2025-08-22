import Dropzone from '../../components/Dropzone'

export default function VideoConvert() {
  return (
    <div>
      <h1>動画 変換</h1>
      <Dropzone accept="video/*" onFiles={() => {}} />
      <p>ここに変換設定フォーム（MP4/WebM など）を配置します。</p>
    </div>
  )
}

