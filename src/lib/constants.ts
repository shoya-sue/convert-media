/**
 * アプリケーション全体で使用する定数
 */

// ファイルサイズ制限
export const MAX_IMAGE_SIZE_MB = 100
export const MAX_VIDEO_SIZE_MB = 800
export const MAX_FILES = 20

// ファイル名フォーマット
export const ZIP_FILENAME_FORMAT = 'convert-media_{date}_{time}.zip'
export const FILENAME_PATTERN = '{base}_{op}{params}.{ext}'

// 画像処理のデフォルト値
export const IMAGE_DEFAULTS = {
  compress: {
    format: 'auto' as const,
    jpeg: { quality: 0.75 },
    png: { lossless: true, level: 3 },
    webp: { quality: 0.75, effort: 4 },
    avif: { cq: 30, effort: 4 },
    stripMeta: true,
  },
  convert: {
    targetFormat: 'webp' as const,
    jpeg: { quality: 0.8 },
    png: { lossless: true },
    webp: { quality: 0.8 },
    avif: { cq: 28 },
    keepICC: false,
  },
  resize: {
    longEdge: 1920,
    fit: 'contain' as const,
    interpolation: 'lanczos' as const,
    format: 'auto' as const,
  },
}

// 動画処理のデフォルト値
export const VIDEO_DEFAULTS = {
  compress: {
    v: {
      codec: 'h264' as const,
      crf: 23,
      preset: 'medium' as const,
      maxLongEdge: null as number | null,
    },
    a: {
      codec: 'aac' as const,
      bitrate: 128,
    },
    fpsCap: null as number | null,
  },
  convert: {
    container: 'mp4' as const,
    v: {
      crf: 23, // MP4のデフォルト
      preset: 'medium' as const,
    },
    a: {
      codec: 'aac' as const,
      bitrate: 128,
    },
  },
  resize: {
    maxLongEdge: 1280,
    v: {
      crf: 23,
      preset: 'medium' as const,
    },
    a: {
      copy: true,
      codec: 'aac' as const,
      bitrate: 128,
    },
  },
}

// プリセット設定
export const PRESETS = {
  image: {
    lightweight: { quality: 0.6, label: '軽量' },
    balanced: { quality: 0.75, label: 'バランス' },
    highQuality: { quality: 0.9, label: '高画質' },
  },
  video: {
    lightweight: { crf: 28, label: '軽量' },
    balanced: { crf: 23, label: 'バランス' },
    highQuality: { crf: 18, label: '高画質' },
  },
  size: {
    small: { value: 1280, label: '小 (1280px)' },
    medium: { value: 1920, label: '中 (1920px)' },
    large: { value: 2560, label: '大 (2560px)' },
  },
}

// ffmpeg プリセット
export const FFMPEG_PRESETS = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
] as const

// サポートされる形式
export const SUPPORTED_FORMATS = {
  image: {
    input: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    output: ['jpeg', 'png', 'webp', 'avif'],
  },
  video: {
    input: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
    output: ['mp4', 'webm'],
  },
}

// Worker メッセージタイプ
export const WORKER_MESSAGE_TYPES = {
  START: 'start',
  PROGRESS: 'progress',
  DONE: 'done',
  ERROR: 'error',
} as const

// タスクタイプ
export const TASK_TYPES = {
  IMAGE_COMPRESS: 'image.compress',
  IMAGE_CONVERT: 'image.convert',
  IMAGE_RESIZE: 'image.resize',
  VIDEO_COMPRESS: 'video.compress',
  VIDEO_CONVERT: 'video.convert',
  VIDEO_RESIZE: 'video.resize',
} as const

// パフォーマンス設定
export const PERFORMANCE = {
  workerTimeout: 600000, // 10分
  progressInterval: 100, // 進捗更新間隔(ms)
  chunkSize: 1024 * 1024 * 10, // 10MB
}

// エラーメッセージ
export const ERROR_MESSAGES = {
  fileTooLarge: 'ファイルサイズが大きすぎます',
  unsupportedFormat: 'サポートされていない形式です',
  processingFailed: '処理に失敗しました',
  workerTimeout: 'タイムアウトしました',
  wasmNotLoaded: 'WASMが読み込まれていません',
}

// ローカルストレージキー
export const STORAGE_KEYS = {
  imageCompress: 'convertMedia.image.compress',
  imageConvert: 'convertMedia.image.convert',
  imageResize: 'convertMedia.image.resize',
  videoCompress: 'convertMedia.video.compress',
  videoConvert: 'convertMedia.video.convert',
  videoResize: 'convertMedia.video.resize',
}