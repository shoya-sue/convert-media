/**
 * Squooshオプション生成ユーティリティ
 * 各種画像処理用のSquooshエンコードオプションを生成
 */

import {
  ImageCompressSchema,
  ImageConvertSchema,
  ImageResizeSchema,
} from './schemas'

/**
 * Squooshのエンコードオプションタイプ
 */
export interface SquooshEncodeOptions {
  mozjpeg?: {
    quality: number
    baseline?: boolean
    arithmetic?: boolean
    progressive?: boolean
    optimize_coding?: boolean
    smoothing?: number
    color_space?: number // 0: YCbCr, 1: Grayscale, 2: RGB
    quant_table?: number
    trellis_multipass?: boolean
    trellis_opt_zero?: boolean
    trellis_opt_table?: boolean
    trellis_loops?: number
    auto_subsample?: boolean
    chroma_subsample?: number // 0: 4:4:4, 1: 4:2:2, 2: 4:2:0
    separate_chroma_quality?: boolean
    chroma_quality?: number
  }
  oxipng?: {
    level: number // 0-6, デフォルト2
    interlace?: boolean
  }
  webp?: {
    quality: number
    target_size?: number
    target_PSNR?: number
    method?: number // 0-6, デフォルト4
    sns_strength?: number
    filter_strength?: number
    filter_sharpness?: number
    filter_type?: number
    partitions?: number
    segments?: number
    pass?: number
    show_compressed?: boolean
    preprocessing?: number
    autofilter?: boolean
    partition_limit?: number
    alpha_compression?: boolean
    alpha_filtering?: number
    alpha_quality?: number
    lossless?: boolean
    exact?: boolean
    image_hint?: number // 0: default, 1: picture, 2: photo, 3: graph
    emulate_jpeg_size?: boolean
    thread_level?: number
    low_memory?: boolean
    near_lossless?: number
    use_delta_palette?: boolean
    use_sharp_yuv?: boolean
  }
  avif?: {
    cqLevel: number // 0-63
    cqAlphaLevel?: number // 0-63
    denoiseLevel?: number // 0-50
    tileColsLog2?: number
    tileRowsLog2?: number
    speed?: number // 0-10
    subsample?: number // 0: YUV444, 1: YUV422, 2: YUV420
    chromaDeltaQ?: boolean
    sharpness?: number // 0-7
    tune?: number // 0: auto, 1: psnr, 2: ssim
  }
}

/**
 * 画像圧縮用のSquooshエンコードオプションを生成
 */
export function buildImageCompressOptions(
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'auto',
  params: ImageCompressSchema,
  originalFormat?: string
): SquooshEncodeOptions {
  // autoの場合は元の形式を使用
  const targetFormat = format === 'auto' ? (originalFormat || 'jpeg') : format

  switch (targetFormat) {
    case 'jpeg':
    case 'jpg':
      return buildJpegOptions(params.jpeg, params)

    case 'png':
      return buildPngOptions(params.png, params)

    case 'webp':
      return buildWebpOptions(params.webp, params)

    case 'avif':
      return buildAvifOptions(params.avif, params)

    default:
      // フォールバック: JPEG
      return buildJpegOptions(params.jpeg, params)
  }
}

/**
 * 画像変換用のSquooshエンコードオプションを生成
 */
export function buildImageConvertOptions(
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
  params: ImageConvertSchema
): SquooshEncodeOptions {
  switch (targetFormat) {
    case 'jpeg':
      return buildJpegOptions(params.jpeg, params)

    case 'png':
      return buildPngOptions(params.png, params)

    case 'webp':
      return buildWebpOptions(params.webp, params)

    case 'avif':
      return buildAvifOptions(params.avif, params)

    default:
      throw new Error(`Unsupported format: ${targetFormat}`)
  }
}

/**
 * 画像リサイズ用のSquooshエンコードオプションを生成
 */
export function buildImageResizeOptions(
  format: 'auto' | 'jpeg' | 'png' | 'webp' | 'avif',
  params: ImageResizeSchema,
  originalFormat?: string
): SquooshEncodeOptions {
  // autoの場合は元の形式を使用
  const targetFormat = format === 'auto' ? (originalFormat || 'jpeg') : format

  // リサイズ時のデフォルト品質設定
  const quality = params.quality || 0.8
  const effort = params.effort || 4

  switch (targetFormat) {
    case 'jpeg':
    case 'jpg':
      return {
        mozjpeg: {
          quality: Math.round(quality * 100),
          baseline: false,
          progressive: true,
          optimize_coding: true,
          chroma_subsample: 2, // 4:2:0
        },
      }

    case 'png':
      return {
        oxipng: {
          level: Math.min(6, effort),
        },
      }

    case 'webp':
      return {
        webp: {
          quality: Math.round(quality * 100),
          method: effort,
          lossless: false,
        },
      }

    case 'avif':
      return {
        avif: {
          cqLevel: Math.round((1 - quality) * 63), // 逆スケール
          speed: Math.max(0, 10 - effort),
          subsample: 2, // YUV420
        },
      }

    default:
      // フォールバック: JPEG
      return {
        mozjpeg: {
          quality: Math.round(quality * 100),
          baseline: false,
          progressive: true,
          optimize_coding: true,
        },
      }
  }
}

/**
 * JPEGオプションを生成
 */
function buildJpegOptions(
  jpegParams: any,
  globalParams: any
): SquooshEncodeOptions {
  const quality = jpegParams?.quality || 0.75
  const baseline = jpegParams?.baseline ?? true
  const chroma = jpegParams?.chroma || '4:2:0'

  // クロマサブサンプリングの値を変換
  let chromaSubsample = 2 // デフォルト 4:2:0
  if (chroma === '4:4:4') chromaSubsample = 0
  else if (chroma === '4:2:2') chromaSubsample = 1

  return {
    mozjpeg: {
      quality: Math.round(quality * 100),
      baseline,
      progressive: !baseline,
      optimize_coding: true,
      smoothing: 0,
      color_space: 0, // YCbCr
      quant_table: 3,
      trellis_multipass: false,
      trellis_opt_zero: false,
      trellis_opt_table: false,
      auto_subsample: false,
      chroma_subsample: chromaSubsample,
      separate_chroma_quality: false,
    },
  }
}

/**
 * PNGオプションを生成
 */
function buildPngOptions(
  pngParams: any,
  globalParams: any
): SquooshEncodeOptions {
  const level = pngParams?.level || globalParams?.effort || 3

  return {
    oxipng: {
      level: Math.min(6, Math.max(0, level)),
      interlace: false,
    },
  }
}

/**
 * WebPオプションを生成
 */
function buildWebpOptions(
  webpParams: any,
  globalParams: any
): SquooshEncodeOptions {
  const quality = webpParams?.quality || 0.75
  const lossless = webpParams?.lossless || false
  const effort = webpParams?.effort || globalParams?.effort || 4

  if (lossless) {
    return {
      webp: {
        quality: 100,
        lossless: true,
        exact: true,
        method: effort,
        image_hint: 0,
        use_sharp_yuv: true,
      },
    }
  }

  return {
    webp: {
      quality: Math.round(quality * 100),
      method: effort,
      sns_strength: 50,
      filter_strength: 60,
      filter_sharpness: 0,
      filter_type: 1,
      partitions: 0,
      segments: 4,
      pass: 1,
      preprocessing: 0,
      autofilter: true,
      alpha_compression: true,
      alpha_filtering: 1,
      alpha_quality: 100,
      lossless: false,
      image_hint: 0,
      emulate_jpeg_size: false,
      use_sharp_yuv: false,
    },
  }
}

/**
 * AVIFオプションを生成
 */
function buildAvifOptions(
  avifParams: any,
  globalParams: any
): SquooshEncodeOptions {
  const cq = avifParams?.cq || 30
  const effort = avifParams?.effort || globalParams?.effort || 4

  return {
    avif: {
      cqLevel: Math.min(63, Math.max(0, cq)),
      cqAlphaLevel: -1, // 自動
      denoiseLevel: 0,
      tileColsLog2: 0,
      tileRowsLog2: 0,
      speed: Math.max(0, 10 - effort), // effortを速度に変換
      subsample: 2, // YUV420
      chromaDeltaQ: false,
      sharpness: 0,
      tune: 0, // auto
    },
  }
}

/**
 * リサイズオプションを生成
 */
export interface SquooshResizeOptions {
  enabled: boolean
  width?: number
  height?: number
  method?: 'triangle' | 'catrom' | 'mitchell' | 'lanczos3' | 'lanczos2'
  fitMethod?: 'stretch' | 'contain' | 'cover'
  premultiply?: boolean
  linearRGB?: boolean
}

/**
 * 画像リサイズ用のオプションを生成
 */
export function buildResizeOptions(
  params: ImageResizeSchema,
  originalWidth: number,
  originalHeight: number
): SquooshResizeOptions {
  const { longEdge, fit, interpolation } = params

  // アスペクト比を計算
  const aspectRatio = originalWidth / originalHeight
  const isLandscape = aspectRatio > 1

  let targetWidth: number
  let targetHeight: number

  if (isLandscape) {
    // 横長画像
    targetWidth = longEdge
    targetHeight = Math.round(longEdge / aspectRatio)
  } else {
    // 縦長画像
    targetHeight = longEdge
    targetWidth = Math.round(longEdge * aspectRatio)
  }

  // 補間方法のマッピング
  const methodMap: Record<string, SquooshResizeOptions['method']> = {
    lanczos: 'lanczos3',
    bilinear: 'triangle',
    cubic: 'catrom',
    nearest: 'triangle', // Squooshにnearestがないのでtriangleで代替
  }

  return {
    enabled: true,
    width: targetWidth,
    height: targetHeight,
    method: methodMap[interpolation] || 'lanczos3',
    fitMethod: fit === 'contain' ? 'contain' : 'cover',
    premultiply: true,
    linearRGB: true,
  }
}

/**
 * 前処理オプション（回転、反転など）
 */
export interface SquooshPreprocessOptions {
  rotate?: {
    numRotations: number // 0-3 (90度単位)
  }
  resize?: SquooshResizeOptions
}

/**
 * Squooshワーカーへのメッセージ型
 */
export interface SquooshWorkerMessage {
  type: 'encode'
  bitmap: ImageBitmap
  options: {
    encodeOptions: SquooshEncodeOptions
    preprocessOptions?: SquooshPreprocessOptions
  }
}

/**
 * エンコード結果の型
 */
export interface SquooshEncodeResult {
  data: Uint8Array
  type: string
  width: number
  height: number
}

/**
 * MIMEタイプからSquoosh形式への変換
 */
export function mimeToSquooshFormat(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'mozjpeg',
    'image/jpg': 'mozjpeg',
    'image/png': 'oxipng',
    'image/webp': 'webp',
    'image/avif': 'avif',
  }
  return map[mimeType] || 'mozjpeg'
}

/**
 * Squoosh形式からMIMEタイプへの変換
 */
export function squooshFormatToMime(format: string): string {
  const map: Record<string, string> = {
    mozjpeg: 'image/jpeg',
    oxipng: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
  }
  return map[format] || 'image/jpeg'
}

/**
 * ファイル拡張子から形式を推定
 */
export function getFormatFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'jpeg',
    jpeg: 'jpeg',
    png: 'png',
    webp: 'webp',
    avif: 'avif',
  }
  return map[ext || ''] || 'jpeg'
}