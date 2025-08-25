import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ImageCompress from './routes/image/Compress'
import ImageConvert from './routes/image/Convert'
import ImageResize from './routes/image/Resize'
import VideoCompress from './routes/video/Compress'
import VideoConvert from './routes/video/Convert'
import VideoResize from './routes/video/Resize'
import { useGlobalShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  // グローバルキーボードショートカット（ヘルプ表示）
  useGlobalShortcuts()
  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img 
            src="/logo.png" 
            alt="Convert Media" 
            style={{ 
              height: 32, 
              width: 'auto',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }} 
          />
          <span>convert-media</span>
        </Link>
        <Sidebar />
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/image/compress" element={<ImageCompress />} />
          <Route path="/image/convert" element={<ImageConvert />} />
          <Route path="/image/resize" element={<ImageResize />} />
          <Route path="/video/compress" element={<VideoCompress />} />
          <Route path="/video/convert" element={<VideoConvert />} />
          <Route path="/video/resize" element={<VideoResize />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

function Welcome() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <img 
        src="/logo.png" 
        alt="Convert Media" 
        style={{ 
          maxWidth: 200,
          height: 'auto',
          marginBottom: 32,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }} 
      />
      <h1>Convert Media へようこそ</h1>
      <p style={{ fontSize: 18, marginTop: 16 }}>
        画像・動画の変換ツール
      </p>
      <p style={{ marginTop: 24, color: '#666' }}>
        左メニューから機能を選択してください（1ページ=1機能）
      </p>
      <div style={{ marginTop: 40, padding: 20, backgroundColor: '#f5f5f5', borderRadius: 8, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
        <h3 style={{ marginBottom: 16 }}>🚀 クイックスタート</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
          <div>
            <strong>📷 画像処理</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>圧縮: ファイルサイズを削減</li>
              <li>変換: 形式を変更（JPEG/PNG/WebP）</li>
              <li>リサイズ: 寸法を変更</li>
            </ul>
          </div>
          <div>
            <strong>🎬 動画処理</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>圧縮: 容量を削減</li>
              <li>変換: MP4/WebMへ変換</li>
              <li>リサイズ: 解像度を変更</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div>
      <h1>404 Not Found</h1>
      <p>ページが見つかりませんでした。</p>
      <NavLink to="/">トップへ戻る</NavLink>
    </div>
  )
}

