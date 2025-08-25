/**
 * ffmpeg処理のメインライブラリ
 * 動画の圧縮・変換・リサイズ処理を統合管理
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import {
  buildVideoCompressArgs,
  buildVideoConvertArgs,
  buildVideoResizeArgs,
  buildThumbnailArgs,
  parseProgress,
  parseDuration,
  generateOutputFilename,
} from './ffmpeg-args'
import {
  VideoCompressParams,
  VideoConvertParams,
  VideoResizeParams,
  ProcessResult,
  WorkerErrorType,
} from '../workers/types'

// ffmpeg インスタンスのシングルトン
let ffmpegInstance: FFmpeg | null = null
let isLoading = false
let isLoaded = false

/**
 * ffmpeg.wasmが利用可能かチェック
 */
export async function checkFfmpegAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/wasm/ffmpeg/ffmpeg-core.js', { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * ffmpeg インスタンスを取得（遅延ロード）
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance
  }

  if (isLoading) {
    // ロード中の場合は完了を待つ
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return ffmpegInstance!
  }

  isLoading = true
  
  try {
    const ffmpeg = new FFmpeg()
    
    // ログ設定（進捗取得用）
    ffmpeg.on('log', ({ type, message }) => {
      console.log(`[${type}] ${message}`)
    })

    // ffmpeg.wasmをロード
    await ffmpeg.load({
      coreURL: '/wasm/ffmpeg/ffmpeg-core.js',
      wasmURL: '/wasm/ffmpeg/ffmpeg-core.wasm',
      workerURL: '/wasm/ffmpeg/ffmpeg-core.worker.js',
    })

    ffmpegInstance = ffmpeg
    isLoaded = true
    return ffmpeg
  } catch (error) {
    isLoading = false
    throw new Error(`Failed to load ffmpeg: ${error}`)
  } finally {
    isLoading = false
  }
}

/**
 * 動画を圧縮
 */
export async function compressVideo(
  file: File,
  params: VideoCompressParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  const ffmpeg = await getFFmpeg()
  
  const inputName = 'input' + getExtension(file.name)
  const outputName = generateOutputFilename(file.name, 'compress', params)

  try {
    // ファイルを書き込み
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    // 総時間を取得
    let duration = 0
    ffmpeg.on('log', ({ message }) => {
      const parsed = parseDuration(message)
      if (parsed) duration = parsed
      
      // 進捗を解析
      if (onProgress && duration > 0) {
        const progress = parseProgress(message, duration)
        if (progress.percent) {
          onProgress(progress.percent / 100)
        }
      }
    })

    // ffmpegコマンドを実行
    const args = buildVideoCompressArgs(params, inputName, outputName)
    await ffmpeg.exec(args)

    // 結果を読み込み
    const data = await ffmpeg.readFile(outputName)
    const blob = new Blob([data], { type: 'video/mp4' })

    // クリーンアップ
    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)

    return {
      blob,
      name: outputName,
      originalSize: file.size,
      size: blob.size,
      duration: Date.now() - startTime,
      metadata: {
        codec: 'h264',
        format: 'mp4',
      },
    }
  } catch (error) {
    throw new Error(`Video compression failed: ${error}`)
  }
}

/**
 * 動画を変換
 */
export async function convertVideo(
  file: File,
  params: VideoConvertParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  const ffmpeg = await getFFmpeg()
  
  const inputName = 'input' + getExtension(file.name)
  const outputName = generateOutputFilename(file.name, 'convert', params, params.container)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    let duration = 0
    ffmpeg.on('log', ({ message }) => {
      const parsed = parseDuration(message)
      if (parsed) duration = parsed
      
      if (onProgress && duration > 0) {
        const progress = parseProgress(message, duration)
        if (progress.percent) {
          onProgress(progress.percent / 100)
        }
      }
    })

    const args = buildVideoConvertArgs(params, inputName, outputName)
    await ffmpeg.exec(args)

    const data = await ffmpeg.readFile(outputName)
    const mimeType = params.container === 'webm' ? 'video/webm' : 'video/mp4'
    const blob = new Blob([data], { type: mimeType })

    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)

    return {
      blob,
      name: outputName,
      originalSize: file.size,
      size: blob.size,
      duration: Date.now() - startTime,
      metadata: {
        format: params.container,
        codec: params.container === 'webm' ? 'vp9' : 'h264',
      },
    }
  } catch (error) {
    throw new Error(`Video conversion failed: ${error}`)
  }
}

/**
 * 動画をリサイズ
 */
export async function resizeVideo(
  file: File,
  params: VideoResizeParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  const ffmpeg = await getFFmpeg()
  
  const inputName = 'input' + getExtension(file.name)
  const outputName = generateOutputFilename(file.name, 'resize', params)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    let duration = 0
    ffmpeg.on('log', ({ message }) => {
      const parsed = parseDuration(message)
      if (parsed) duration = parsed
      
      if (onProgress && duration > 0) {
        const progress = parseProgress(message, duration)
        if (progress.percent) {
          onProgress(progress.percent / 100)
        }
      }
    })

    const args = buildVideoResizeArgs(params, inputName, outputName)
    await ffmpeg.exec(args)

    const data = await ffmpeg.readFile(outputName)
    const blob = new Blob([data], { type: 'video/mp4' })

    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)

    return {
      blob,
      name: outputName,
      originalSize: file.size,
      size: blob.size,
      duration: Date.now() - startTime,
      metadata: {
        format: 'mp4',
        codec: 'h264',
      },
    }
  } catch (error) {
    throw new Error(`Video resize failed: ${error}`)
  }
}

/**
 * 動画からサムネイルを生成
 */
export async function generateThumbnail(
  file: File,
  position: number = 10,
  options?: {
    width?: number
    height?: number
    quality?: number
  }
): Promise<Blob> {
  const ffmpeg = await getFFmpeg()
  
  const inputName = 'input' + getExtension(file.name)
  const outputName = 'thumbnail.jpg'

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const args = buildThumbnailArgs(position, inputName, outputName, options)
    await ffmpeg.exec(args)

    const data = await ffmpeg.readFile(outputName)
    const blob = new Blob([data], { type: 'image/jpeg' })

    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)

    return blob
  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error}`)
  }
}

/**
 * 複数のサムネイルを生成
 */
export async function generateMultipleThumbnails(
  file: File,
  positions: number[] = [10, 50, 90],
  options?: {
    width?: number
    height?: number
    quality?: number
  }
): Promise<Blob[]> {
  const ffmpeg = await getFFmpeg()
  const inputName = 'input' + getExtension(file.name)
  const thumbnails: Blob[] = []

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    for (let i = 0; i < positions.length; i++) {
      const outputName = `thumbnail_${i + 1}.jpg`
      const args = buildThumbnailArgs(positions[i], inputName, outputName, options)
      
      await ffmpeg.exec(args)
      
      const data = await ffmpeg.readFile(outputName)
      thumbnails.push(new Blob([data], { type: 'image/jpeg' }))
      
      await ffmpeg.deleteFile(outputName)
    }

    await ffmpeg.deleteFile(inputName)
    return thumbnails
  } catch (error) {
    throw new Error(`Multiple thumbnail generation failed: ${error}`)
  }
}

/**
 * 動画のメタデータを取得
 */
export async function getVideoMetadata(file: File): Promise<any> {
  const ffmpeg = await getFFmpeg()
  const inputName = 'input' + getExtension(file.name)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    // ffprobeの代わりにffmpegでメタデータを取得
    const result = await ffmpeg.exec([
      '-i', inputName,
      '-f', 'null',
      '-'
    ])

    await ffmpeg.deleteFile(inputName)

    // ログからメタデータを解析（簡易実装）
    return {
      format: file.type,
      size: file.size,
      name: file.name,
    }
  } catch (error) {
    // メタデータ取得のエラーは通常の処理フロー
    return {
      format: file.type,
      size: file.size,
      name: file.name,
    }
  }
}

/**
 * ffmpegインスタンスをクリーンアップ
 */
export function cleanupFFmpeg(): void {
  if (ffmpegInstance) {
    // メモリを解放
    ffmpegInstance = null
    isLoaded = false
    isLoading = false
  }
}

/**
 * ファイルの拡張子を取得
 */
function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/)
  return match ? match[0] : '.mp4'
}

/**
 * バッチ処理用のヘルパー関数
 */
export async function processVideoBatch(
  files: File[],
  operation: 'compress' | 'convert' | 'resize',
  params: any,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const progressCallback = onProgress 
      ? (progress: number) => onProgress(i, progress)
      : undefined

    let result: ProcessResult
    
    switch (operation) {
      case 'compress':
        result = await compressVideo(file, params, progressCallback)
        break
      case 'convert':
        result = await convertVideo(file, params, progressCallback)
        break
      case 'resize':
        result = await resizeVideo(file, params, progressCallback)
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    results.push(result)
  }

  return results
}

// エクスポート（既存のvideo.tsとの互換性のため）
export { isFfmpegAvailable } from './video'