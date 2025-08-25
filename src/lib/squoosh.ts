/**
 * Squoosh処理のメインライブラリ
 * 画像の圧縮・変換・リサイズ処理を統合管理
 */

import {
  buildImageCompressOptions,
  buildImageConvertOptions,
  buildImageResizeOptions,
  buildResizeOptions,
  mimeToSquooshFormat,
  squooshFormatToMime,
  getFormatFromExtension,
  SquooshEncodeOptions,
  SquooshResizeOptions,
} from './squoosh-opts'
import {
  ImageCompressParams,
  ImageConvertParams,
  ImageResizeParams,
  ProcessResult,
  WorkerErrorType,
} from '../workers/types'

// Squoosh初期化状態
let squooshAvailable = false
let squooshChecked = false

/**
 * Squooshが利用可能かチェック
 */
export async function checkSquooshAvailability(): Promise<boolean> {
  if (squooshChecked) {
    return squooshAvailable
  }

  try {
    const response = await fetch('/wasm/squoosh/init.mjs', { method: 'HEAD' })
    squooshAvailable = response.ok
    squooshChecked = true
    return squooshAvailable
  } catch {
    squooshAvailable = false
    squooshChecked = true
    return false
  }
}

/**
 * 画像を圧縮（Squoosh使用）
 */
export async function compressImageWithSquoosh(
  file: File,
  params: ImageCompressParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  
  if (!await checkSquooshAvailability()) {
    throw new Error('Squoosh is not available')
  }

  try {
    // ImageBitmapを作成
    const bitmap = await createImageBitmap(file)
    
    // Workerで処理
    const worker = new Worker(
      new URL('../workers/imageSquoosh.worker.ts', import.meta.url),
      { type: 'module' }
    )

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'progress' && onProgress) {
          onProgress(e.data.progress)
        }
        if (e.data.type === 'done') {
          const blob = new Blob([e.data.data], { type: e.data.mime })
          worker.terminate()
          resolve({
            blob,
            name: generateOutputFilename(file.name, 'compress', params),
            originalSize: file.size,
            size: blob.size,
            duration: Date.now() - startTime,
            metadata: {
              width: bitmap.width,
              height: bitmap.height,
              format: e.data.format,
            },
          })
        }
        if (e.data.type === 'error') {
          worker.terminate()
          reject(new Error(e.data.error))
        }
      }

      // エンコードオプションを生成
      const options = buildImageCompressOptions(
        params.format,
        params,
        file.type
      )

      // Workerにメッセージを送信
      worker.postMessage({
        type: 'encode',
        bitmap,
        options: {
          encodeOptions: options,
        },
      })
    })
  } catch (error) {
    throw new Error(`Image compression failed: ${error}`)
  }
}

/**
 * 画像を変換（Squoosh使用）
 */
export async function convertImageWithSquoosh(
  file: File,
  params: ImageConvertParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  
  if (!await checkSquooshAvailability()) {
    throw new Error('Squoosh is not available')
  }

  try {
    const bitmap = await createImageBitmap(file)
    
    const worker = new Worker(
      new URL('../workers/imageSquoosh.worker.ts', import.meta.url),
      { type: 'module' }
    )

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'progress' && onProgress) {
          onProgress(e.data.progress)
        }
        if (e.data.type === 'done') {
          const blob = new Blob([e.data.data], { type: e.data.mime })
          worker.terminate()
          resolve({
            blob,
            name: generateOutputFilename(file.name, 'convert', params),
            originalSize: file.size,
            size: blob.size,
            duration: Date.now() - startTime,
            metadata: {
              width: bitmap.width,
              height: bitmap.height,
              format: params.targetFormat,
            },
          })
        }
        if (e.data.type === 'error') {
          worker.terminate()
          reject(new Error(e.data.error))
        }
      }

      const options = buildImageConvertOptions(params.targetFormat, params)

      worker.postMessage({
        type: 'encode',
        bitmap,
        options: {
          encodeOptions: options,
        },
      })
    })
  } catch (error) {
    throw new Error(`Image conversion failed: ${error}`)
  }
}

/**
 * 画像をリサイズ（Squoosh使用）
 */
export async function resizeImageWithSquoosh(
  file: File,
  params: ImageResizeParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  
  if (!await checkSquooshAvailability()) {
    throw new Error('Squoosh is not available')
  }

  try {
    const bitmap = await createImageBitmap(file)
    
    const worker = new Worker(
      new URL('../workers/imageSquoosh.worker.ts', import.meta.url),
      { type: 'module' }
    )

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'progress' && onProgress) {
          onProgress(e.data.progress)
        }
        if (e.data.type === 'done') {
          const blob = new Blob([e.data.data], { type: e.data.mime })
          worker.terminate()
          
          // リサイズ後のサイズを計算
          const aspectRatio = bitmap.width / bitmap.height
          const isLandscape = aspectRatio > 1
          let newWidth: number
          let newHeight: number
          
          if (isLandscape) {
            newWidth = params.longEdge
            newHeight = Math.round(params.longEdge / aspectRatio)
          } else {
            newHeight = params.longEdge
            newWidth = Math.round(params.longEdge * aspectRatio)
          }

          resolve({
            blob,
            name: generateOutputFilename(file.name, 'resize', params),
            originalSize: file.size,
            size: blob.size,
            duration: Date.now() - startTime,
            metadata: {
              width: newWidth,
              height: newHeight,
              format: e.data.format,
            },
          })
        }
        if (e.data.type === 'error') {
          worker.terminate()
          reject(new Error(e.data.error))
        }
      }

      const resizeOptions = buildResizeOptions(
        params,
        bitmap.width,
        bitmap.height
      )
      
      const encodeOptions = buildImageResizeOptions(
        params.format,
        params,
        file.type
      )

      worker.postMessage({
        type: 'encode',
        bitmap,
        options: {
          preprocessOptions: {
            resize: resizeOptions,
          },
          encodeOptions,
        },
      })
    })
  } catch (error) {
    throw new Error(`Image resize failed: ${error}`)
  }
}

/**
 * Canvas APIを使用したフォールバック圧縮
 */
export async function compressImageWithCanvas(
  file: File,
  params: ImageCompressParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const startTime = Date.now()
  
  // 既存のimage.tsの実装を使用
  const { compressImageFile } = await import('./image')
  
  if (onProgress) onProgress(0.5)
  
  const result = await compressImageFile(file, params)
  
  if (onProgress) onProgress(1)

  return {
    blob: result.blob,
    name: generateOutputFilename(file.name, 'compress', params),
    originalSize: file.size,
    size: result.bytes,
    duration: Date.now() - startTime,
    metadata: {
      format: result.type,
    },
  }
}

/**
 * 画像を圧縮（自動選択）
 */
export async function compressImage(
  file: File,
  params: ImageCompressParams,
  onProgress?: (progress: number) => void
): Promise<ProcessResult> {
  const squooshAvailable = await checkSquooshAvailability()
  
  if (squooshAvailable) {
    try {
      return await compressImageWithSquoosh(file, params, onProgress)
    } catch (error) {
      console.warn('Squoosh compression failed, falling back to Canvas:', error)
      return await compressImageWithCanvas(file, params, onProgress)
    }
  } else {
    return await compressImageWithCanvas(file, params, onProgress)
  }
}

/**
 * バッチ処理用のヘルパー関数
 */
export async function processImageBatch(
  files: File[],
  operation: 'compress' | 'convert' | 'resize',
  params: any,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []
  const squooshAvailable = await checkSquooshAvailability()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const progressCallback = onProgress 
      ? (progress: number) => onProgress(i, progress)
      : undefined

    let result: ProcessResult
    
    switch (operation) {
      case 'compress':
        result = await compressImage(file, params, progressCallback)
        break
      case 'convert':
        if (squooshAvailable) {
          result = await convertImageWithSquoosh(file, params, progressCallback)
        } else {
          // Canvas フォールバック
          result = await compressImageWithCanvas(file, {
            format: params.targetFormat,
            quality: params.quality,
          }, progressCallback)
        }
        break
      case 'resize':
        if (squooshAvailable) {
          result = await resizeImageWithSquoosh(file, params, progressCallback)
        } else {
          // Canvas フォールバック（簡易実装）
          result = await compressImageWithCanvas(file, {
            format: params.format,
            quality: params.quality,
          }, progressCallback)
        }
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    results.push(result)
  }

  return results
}

/**
 * 出力ファイル名を生成
 */
function generateOutputFilename(
  inputName: string,
  operation: string,
  params: any
): string {
  const base = inputName.replace(/\.[^.]+$/, '')
  let suffix = `_${operation}`
  
  if (operation === 'compress' && params.format && params.format !== 'auto') {
    suffix += `_${params.format}`
  } else if (operation === 'convert' && params.targetFormat) {
    suffix += `_to_${params.targetFormat}`
  } else if (operation === 'resize' && params.longEdge) {
    suffix += `_${params.longEdge}px`
  }

  const extension = getOutputExtension(params, inputName)
  return `${base}${suffix}.${extension}`
}

/**
 * 出力拡張子を決定
 */
function getOutputExtension(params: any, inputName: string): string {
  if (params.format && params.format !== 'auto') {
    return params.format
  }
  if (params.targetFormat) {
    return params.targetFormat
  }
  
  // 入力ファイルの拡張子を使用
  const match = inputName.match(/\.([^.]+)$/)
  return match ? match[1] : 'jpg'
}

/**
 * 画像のメタデータを取得
 */
export async function getImageMetadata(file: File): Promise<any> {
  try {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      format: file.type,
      size: file.size,
      name: file.name,
    }
  } catch (error) {
    return {
      format: file.type,
      size: file.size,
      name: file.name,
    }
  }
}

// エクスポート（既存のimage.tsとの互換性のため）
export { checkSquooshAvailability as isSquooshAvailable } from './image'