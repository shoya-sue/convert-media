/**
 * ffmpegコマンド生成ユーティリティ
 * 各種動画処理用のffmpegコマンドライン引数を生成
 */

import {
  VideoCompressSchema,
  VideoConvertSchema,
  VideoResizeSchema,
} from './schemas'

/**
 * 動画圧縮用のffmpeg引数を生成
 */
export function buildVideoCompressArgs(
  params: VideoCompressSchema,
  inputName: string = 'input',
  outputName: string = 'output.mp4'
): string[] {
  const args: string[] = ['-i', inputName]

  // 映像のスケーリング（長辺指定）
  if (params.v.maxLongEdge) {
    const scale = params.v.maxLongEdge
    // アスペクト比を維持しつつ、偶数ピクセルに調整
    args.push(
      '-vf',
      `scale='if(gt(a,1),min(${scale},iw),-2)':'if(gt(a,1),-2,min(${scale},ih))'`
    )
  }

  // FPS制限
  if (params.fpsCap) {
    args.push('-r', String(params.fpsCap))
  }

  // 映像エンコード設定
  args.push(
    '-c:v', 'libx264',
    '-crf', String(params.v.crf),
    '-preset', params.v.preset,
    '-pix_fmt', 'yuv420p', // 互換性のため
    '-profile:v', 'high',
    '-level', '4.0'
  )

  // 音声エンコード設定
  if (params.a.codec === 'none') {
    args.push('-an') // 音声なし
  } else if (params.a.codec === 'aac') {
    args.push(
      '-c:a', 'aac',
      '-b:a', `${params.a.bitrate}k`,
      '-ac', '2' // ステレオ
    )
  } else if (params.a.codec === 'opus') {
    args.push(
      '-c:a', 'libopus',
      '-b:a', `${params.a.bitrate}k`,
      '-ac', '2'
    )
  }

  // MP4最適化
  args.push('-movflags', '+faststart')

  // 出力ファイル
  args.push(outputName)

  return args
}

/**
 * 動画変換用のffmpeg引数を生成
 */
export function buildVideoConvertArgs(
  params: VideoConvertSchema,
  inputName: string = 'input',
  outputName?: string
): string[] {
  const args: string[] = ['-i', inputName]

  // 出力ファイル名の決定
  const output = outputName || `output.${params.container}`

  if (params.container === 'mp4') {
    // MP4 (H.264/AAC)
    args.push(
      '-c:v', 'libx264',
      '-crf', String(params.v.crf),
      '-preset', params.v.preset,
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      '-level', '4.0'
    )

    if (params.a.codec === 'aac') {
      args.push(
        '-c:a', 'aac',
        '-b:a', `${params.a.bitrate}k`,
        '-ac', '2'
      )
    }

    args.push('-movflags', '+faststart')
  } else if (params.container === 'webm') {
    // WebM (VP9/Opus)
    const webmCrf = Math.min(38, Math.max(28, params.v.crf + 9)) // WebMは高めのCRF
    args.push(
      '-c:v', 'libvpx-vp9',
      '-crf', String(webmCrf),
      '-b:v', '0', // CRFモード
      '-cpu-used', '2', // エンコード速度（0-5、低いほど高品質）
      '-row-mt', '1', // マルチスレッド
      '-tile-columns', '2',
      '-tile-rows', '1',
      '-threads', '0' // 自動
    )

    if (params.a.codec === 'opus') {
      args.push(
        '-c:a', 'libopus',
        '-b:a', `${params.a.bitrate}k`,
        '-ac', '2'
      )
    } else {
      // WebMでAACは非推奨だがフォールバック
      args.push(
        '-c:a', 'libopus',
        '-b:a', `${params.a.bitrate}k`,
        '-ac', '2'
      )
    }
  }

  // 出力ファイル
  args.push(output)

  return args
}

/**
 * 動画リサイズ用のffmpeg引数を生成
 */
export function buildVideoResizeArgs(
  params: VideoResizeSchema,
  inputName: string = 'input',
  outputName: string = 'output.mp4'
): string[] {
  const args: string[] = ['-i', inputName]

  // スケーリング（長辺指定、偶数ピクセル調整）
  const scale = params.maxLongEdge
  args.push(
    '-vf',
    `scale='if(gt(a,1),min(${scale},iw),-2)':'if(gt(a,1),-2,min(${scale},ih))'`
  )

  // FPS制限（オプション）
  if (params.fpsCap) {
    args.push('-r', String(params.fpsCap))
  }

  // 映像エンコード設定
  args.push(
    '-c:v', 'libx264',
    '-crf', String(params.v.crf),
    '-preset', params.v.preset,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.0'
  )

  // 音声設定
  if (params.a.copy) {
    // 音声をコピー（再エンコードなし）
    args.push('-c:a', 'copy')
  } else {
    // 音声を再エンコード
    if (params.a.codec === 'aac') {
      args.push(
        '-c:a', 'aac',
        '-b:a', `${params.a.bitrate}k`,
        '-ac', '2'
      )
    } else if (params.a.codec === 'opus') {
      args.push(
        '-c:a', 'libopus',
        '-b:a', `${params.a.bitrate}k`,
        '-ac', '2'
      )
    }
  }

  // MP4最適化
  args.push('-movflags', '+faststart')

  // 出力ファイル
  args.push(outputName)

  return args
}

/**
 * サムネイル生成用のffmpeg引数を生成
 */
export function buildThumbnailArgs(
  position: number = 10, // パーセンテージ（0-100）
  inputName: string = 'input',
  outputName: string = 'thumbnail.jpg',
  options?: {
    width?: number
    height?: number
    quality?: number
  }
): string[] {
  const args: string[] = []

  // 位置指定（動画の長さの何％の位置か）
  // ss オプションは入力の前に置くと高速
  args.push('-ss', `${position}%`)
  args.push('-i', inputName)

  // 1フレームのみ抽出
  args.push('-frames:v', '1')

  // スケーリング（オプション）
  if (options?.width || options?.height) {
    const w = options.width || -1
    const h = options.height || -1
    args.push('-vf', `scale=${w}:${h}`)
  }

  // JPEG品質（オプション）
  if (options?.quality) {
    args.push('-q:v', String(Math.round(31 - options.quality * 30))) // ffmpegは2-31（低いほど高品質）
  } else {
    args.push('-q:v', '2') // デフォルト高品質
  }

  // 出力
  args.push(outputName)

  return args
}

/**
 * 複数サムネイル生成用のffmpeg引数を生成（3枚プレビュー用）
 */
export function buildMultipleThumbnailsArgs(
  positions: number[] = [10, 50, 90], // パーセンテージ配列
  inputName: string = 'input',
  outputPattern: string = 'thumbnail_%d.jpg',
  options?: {
    width?: number
    height?: number
    quality?: number
  }
): string[][] {
  // 各位置に対して個別のコマンドを生成
  return positions.map((position, index) => {
    const outputName = outputPattern.replace('%d', String(index + 1))
    return buildThumbnailArgs(position, inputName, outputName, options)
  })
}

/**
 * 動画情報取得用のffmpeg引数を生成
 */
export function buildProbeArgs(inputName: string = 'input'): string[] {
  return [
    '-i', inputName,
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams'
  ]
}

/**
 * プログレス取得用の正規表現パターン
 */
export const PROGRESS_PATTERNS = {
  duration: /Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d+)/,
  time: /time=(\d{2}):(\d{2}):(\d{2}\.\d+)/,
  frame: /frame=\s*(\d+)/,
  fps: /fps=\s*([\d.]+)/,
  bitrate: /bitrate=\s*([\d.]+)kbits\/s/,
  speed: /speed=\s*([\d.]+)x/,
}

/**
 * ffmpegログから進捗を解析
 */
export function parseProgress(log: string, totalDuration?: number): {
  percent?: number
  time?: number
  frame?: number
  fps?: number
  speed?: number
} {
  const result: any = {}

  // 現在時刻を取得
  const timeMatch = log.match(PROGRESS_PATTERNS.time)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    const seconds = parseFloat(timeMatch[3])
    result.time = hours * 3600 + minutes * 60 + seconds

    // 総時間が分かっている場合はパーセンテージを計算
    if (totalDuration && totalDuration > 0) {
      result.percent = Math.min(100, (result.time / totalDuration) * 100)
    }
  }

  // フレーム数
  const frameMatch = log.match(PROGRESS_PATTERNS.frame)
  if (frameMatch) {
    result.frame = parseInt(frameMatch[1], 10)
  }

  // FPS
  const fpsMatch = log.match(PROGRESS_PATTERNS.fps)
  if (fpsMatch) {
    result.fps = parseFloat(fpsMatch[1])
  }

  // 速度
  const speedMatch = log.match(PROGRESS_PATTERNS.speed)
  if (speedMatch) {
    result.speed = parseFloat(speedMatch[1])
  }

  return result
}

/**
 * ffmpegログから総時間を取得
 */
export function parseDuration(log: string): number | null {
  const match = log.match(PROGRESS_PATTERNS.duration)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseFloat(match[3])
    return hours * 3600 + minutes * 60 + seconds
  }
  return null
}

/**
 * 出力ファイル名を生成
 */
export function generateOutputFilename(
  inputName: string,
  operation: 'compress' | 'convert' | 'resize',
  params: any,
  extension?: string
): string {
  const base = inputName.replace(/\.[^/.]+$/, '') // 拡張子を除去
  const ext = extension || inputName.split('.').pop() || 'mp4'

  let suffix = `_${operation}`

  // パラメータに基づいてサフィックスを追加
  if (operation === 'compress' && params.v?.crf) {
    suffix += `_crf${params.v.crf}`
    if (params.v.maxLongEdge) {
      suffix += `_${params.v.maxLongEdge}w`
    }
  } else if (operation === 'convert' && params.container) {
    suffix += `_to_${params.container}`
  } else if (operation === 'resize' && params.maxLongEdge) {
    suffix += `_${params.maxLongEdge}w`
  }

  return `${base}${suffix}.${ext}`
}