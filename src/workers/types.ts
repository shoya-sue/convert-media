/**
 * Worker/タスク仕様の型定義
 * 全Workerで共通して使用する型を定義
 */

// タスクタイプ
export type TaskType = 
  | 'image.compress' 
  | 'image.convert' 
  | 'image.resize' 
  | 'video.compress' 
  | 'video.convert' 
  | 'video.resize'

// 開始メッセージ
export type StartMessage = {
  type: 'start'
  task: TaskType
  files: { 
    name: string
    type: string
    data: ArrayBuffer 
  }[] // Transferable
  params: unknown // ページごとのスキーマで検証済み
}

// 進捗メッセージ
export type ProgressMessage = {
  type: 'progress'
  task: TaskType
  progress: number // 0..1
  details?: Record<string, unknown>
}

// 完了メッセージ
export type DoneMessage = {
  type: 'done'
  task: TaskType
  results: { 
    name: string
    type: string
    data: ArrayBuffer 
  }[] // Transferable返却
}

// エラーメッセージ
export type ErrorMessage = { 
  type: 'error'
  task: TaskType
  error: string 
}

// Worker メッセージの統合型
export type WorkerMessage = 
  | StartMessage 
  | ProgressMessage 
  | DoneMessage 
  | ErrorMessage

// 画像処理パラメータ
export interface ImageCompressParams {
  format: 'auto' | 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number
  effort?: number
  stripMeta?: boolean
  avoidUpsize?: boolean
}

export interface ImageConvertParams {
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number
  effort?: number
  keepICC?: boolean
  keepEXIF?: boolean
}

export interface ImageResizeParams {
  longEdge: number
  fit: 'contain' | 'cover'
  interpolation: 'lanczos' | 'bilinear' | 'cubic' | 'nearest'
  format: 'auto' | 'jpeg' | 'png' | 'webp' | 'avif'
  quality?: number
}

// 動画処理パラメータ
export interface VideoCompressParams {
  v: {
    codec: 'h264'
    crf: number
    preset: string
    maxLongEdge?: number | null
  }
  a: {
    codec: 'aac' | 'opus' | 'none'
    bitrate: number
  }
  fpsCap?: number | null
  thumbnailPosition?: number
}

export interface VideoConvertParams {
  container: 'mp4' | 'webm'
  v: {
    crf: number
    preset: string
  }
  a: {
    codec: 'aac' | 'opus'
    bitrate: number
  }
  thumbnailPosition?: number
}

export interface VideoResizeParams {
  maxLongEdge: number
  v: {
    crf: number
    preset: string
  }
  a: {
    copy: boolean
    codec?: 'aac' | 'opus'
    bitrate?: number
  }
  fpsCap?: number | null
  thumbnailPosition?: number
}

// Worker 初期化オプション
export interface WorkerOptions {
  wasmPath?: string
  threads?: number
  simd?: boolean
}

// 処理結果
export interface ProcessResult {
  blob: Blob
  name: string
  originalSize: number
  size: number
  duration?: number // 処理時間（ミリ秒）
  metadata?: {
    width?: number
    height?: number
    format?: string
    codec?: string
    fps?: number
    bitrate?: number
  }
}

// エラータイプ
export enum WorkerErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  WASM_NOT_LOADED = 'WASM_NOT_LOADED',
  TIMEOUT = 'TIMEOUT',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  CANCELLED = 'CANCELLED',
}

// Worker 状態
export enum WorkerState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
}

// ユーティリティ型
export type WorkerCallback<T = any> = (message: T) => void
export type ProgressCallback = (progress: number, details?: any) => void
export type ErrorCallback = (error: Error | string) => void

// Worker プール設定
export interface WorkerPoolConfig {
  maxWorkers: number
  taskQueueSize: number
  workerIdleTimeout: number
}

// タスクキュー項目
export interface QueuedTask {
  id: string
  type: TaskType
  priority: number
  data: any
  callbacks: {
    onProgress?: ProgressCallback
    onComplete?: (result: any) => void
    onError?: ErrorCallback
  }
}