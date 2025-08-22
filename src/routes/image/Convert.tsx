import Dropzone from '../../components/Dropzone'

export default function ImageConvert() {
  return (
    <div>
      <h1>画像 変換</h1>
      <Dropzone accept="image/*" onFiles={() => {}} />
      <p>ここに変換設定フォーム（形式選択など）を配置します。</p>
    </div>
  )
}

