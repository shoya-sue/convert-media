/**
 * VideoPreview コンポーネント
 * 動画のプレビュー、サムネイル、短尺プレビューを表示
 */
import React, { useEffect, useRef, useState } from 'react'
import styles from './VideoPreview.module.css'

interface VideoPreviewProps {
  /** 動画のURL（BlobまたはObjectURL） */
  src: string | Blob
  /** サムネイル画像（オプション） */
  poster?: string | Blob
  /** 複数のサムネイル（3枚プレビュー用） */
  thumbnails?: (string | Blob)[]
  /** コントロールを表示するか */
  controls?: boolean
  /** 自動再生（ミュート必須） */
  autoplay?: boolean
  /** ループ再生 */
  loop?: boolean
  /** ミュート */
  muted?: boolean
  /** 幅 */
  width?: string | number
  /** 高さ */
  height?: string | number
  /** クラス名 */
  className?: string
  /** Before/After比較モード */
  comparison?: {
    before: string | Blob
    after: string | Blob
  }
  /** ファイルサイズ情報 */
  sizeInfo?: {
    before: number
    after: number
  }
  /** 削減率を表示 */
  showReduction?: boolean
  /** ダウンロードボタンを表示 */
  showDownload?: boolean
  /** ダウンロード時のファイル名 */
  downloadName?: string
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  src,
  poster,
  thumbnails,
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  width,
  height,
  className,
  comparison,
  sizeInfo,
  showReduction = false,
  showDownload = false,
  downloadName = 'video',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [posterUrl, setPosterUrl] = useState<string>('')
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([])
  const [comparisonUrls, setComparisonUrls] = useState<{
    before: string
    after: string
  }>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Blob URLの作成と管理
  useEffect(() => {
    if (src instanceof Blob) {
      const url = URL.createObjectURL(src)
      setVideoUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (src) {
      setVideoUrl(src)
    }
  }, [src])

  useEffect(() => {
    if (poster instanceof Blob) {
      const url = URL.createObjectURL(poster)
      setPosterUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (poster) {
      setPosterUrl(poster)
    }
  }, [poster])

  useEffect(() => {
    if (thumbnails && thumbnails.length > 0) {
      const urls = thumbnails.map((thumb) =>
        thumb instanceof Blob ? URL.createObjectURL(thumb) : thumb
      )
      setThumbnailUrls(urls)
      return () => {
        urls.forEach((url) => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
          }
        })
      }
    }
  }, [thumbnails])

  useEffect(() => {
    if (comparison) {
      const beforeUrl =
        comparison.before instanceof Blob
          ? URL.createObjectURL(comparison.before)
          : comparison.before
      const afterUrl =
        comparison.after instanceof Blob
          ? URL.createObjectURL(comparison.after)
          : comparison.after
      setComparisonUrls({ before: beforeUrl, after: afterUrl })
      return () => {
        if (beforeUrl.startsWith('blob:')) URL.revokeObjectURL(beforeUrl)
        if (afterUrl.startsWith('blob:')) URL.revokeObjectURL(afterUrl)
      }
    }
  }, [comparison])

  // 動画メタデータの取得
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // ファイルサイズのフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // 削減率の計算
  const calculateReduction = (before: number, after: number): number => {
    if (before === 0) return 0
    return Math.round(((before - after) / before) * 100)
  }

  // ダウンロード処理
  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = downloadName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  // 時間のフォーマット
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // 比較モードの場合
  if (comparisonUrls) {
    return (
      <div className={`${styles.comparison} ${className || ''}`}>
        <div className={styles.comparisonContainer}>
          <div className={styles.comparisonItem}>
            <h4>Before</h4>
            <video
              src={comparisonUrls.before}
              controls
              muted
              width={width}
              height={height}
              className={styles.video}
            />
            {sizeInfo && (
              <div className={styles.sizeInfo}>{formatFileSize(sizeInfo.before)}</div>
            )}
          </div>
          <div className={styles.comparisonItem}>
            <h4>After</h4>
            <video
              src={comparisonUrls.after}
              controls
              muted
              width={width}
              height={height}
              className={styles.video}
            />
            {sizeInfo && (
              <div className={styles.sizeInfo}>
                {formatFileSize(sizeInfo.after)}
                {showReduction && (
                  <span className={styles.reduction}>
                    (-{calculateReduction(sizeInfo.before, sizeInfo.after)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // サムネイルプレビューモード
  if (thumbnailUrls.length > 0) {
    return (
      <div className={`${styles.thumbnailPreview} ${className || ''}`}>
        <h4>サムネイルプレビュー</h4>
        <div className={styles.thumbnailGrid}>
          {thumbnailUrls.map((url, index) => (
            <div key={index} className={styles.thumbnailItem}>
              <img src={url} alt={`Thumbnail ${index + 1}`} />
              {showDownload && (
                <a href={url} download={`thumbnail_${index + 1}.jpg`} className={styles.downloadLink}>
                  ダウンロード
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 通常の動画プレビュー
  return (
    <div className={`${styles.preview} ${className || ''}`}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          controls={controls}
          autoPlay={autoplay}
          loop={loop}
          muted={muted || autoplay}
          width={width}
          height={height}
          className={styles.video}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* カスタムコントロール（オプション） */}
        {!controls && duration > 0 && (
          <div className={styles.customControls}>
            <button onClick={handlePlayPause} className={styles.playButton}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className={styles.progressBar}>
              <div
                className={styles.progress}
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className={styles.time}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}
      </div>

      {/* ファイルサイズと削減率 */}
      {sizeInfo && (
        <div className={styles.info}>
          <div className={styles.sizeComparison}>
            <span>元: {formatFileSize(sizeInfo.before)}</span>
            <span className={styles.arrow}>→</span>
            <span>
              結果: {formatFileSize(sizeInfo.after)}
              {showReduction && (
                <span className={styles.reductionBadge}>
                  -{calculateReduction(sizeInfo.before, sizeInfo.after)}%
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ダウンロードボタン */}
      {showDownload && (
        <button onClick={handleDownload} className={styles.downloadButton}>
          動画をダウンロード
        </button>
      )}
    </div>
  )
}