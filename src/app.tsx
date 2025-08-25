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
        <Link to="/" className="brand">convert-media</Link>
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
    <div>
      <h1>ようこそ</h1>
      <p>左メニューから機能を選択してください（1ページ=1機能）。</p>
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

