import { describe, it, expect } from 'vitest'
import * as constants from '../constants'

describe('constants', () => {
  describe('File Size Limits', () => {
    it('defines maximum image size', () => {
      expect(constants.MAX_IMAGE_SIZE_MB).toBe(100)
    })

    it('defines maximum video size', () => {
      expect(constants.MAX_VIDEO_SIZE_MB).toBe(800)
    })

    it('defines maximum files count', () => {
      expect(constants.MAX_FILES).toBe(20)
    })
  })

  describe('Filename Formats', () => {
    it('defines ZIP filename format', () => {
      expect(constants.ZIP_FILENAME_FORMAT).toBe('convert-media_{date}_{time}.zip')
    })

    it('defines filename pattern', () => {
      expect(constants.FILENAME_PATTERN).toBe('{base}_{op}{params}.{ext}')
    })
  })

  describe('Image Defaults', () => {
    it('has compress defaults', () => {
      expect(constants.IMAGE_DEFAULTS.compress).toEqual({
        format: 'auto',
        jpeg: { quality: 0.75 },
        png: { lossless: true, level: 3 },
        webp: { quality: 0.75, effort: 4 },
        avif: { cq: 30, effort: 4 },
        stripMeta: true,
      })
    })

    it('has convert defaults', () => {
      expect(constants.IMAGE_DEFAULTS.convert).toEqual({
        targetFormat: 'webp',
        jpeg: { quality: 0.8 },
        png: { lossless: true },
        webp: { quality: 0.8 },
        avif: { cq: 28 },
        keepICC: false,
      })
    })

    it('has resize defaults', () => {
      expect(constants.IMAGE_DEFAULTS.resize).toEqual({
        longEdge: 1920,
        fit: 'contain',
        interpolation: 'lanczos',
        format: 'auto',
      })
    })
  })

  describe('Video Defaults', () => {
    it('has compress defaults', () => {
      expect(constants.VIDEO_DEFAULTS.compress.v.crf).toBe(23)
      expect(constants.VIDEO_DEFAULTS.compress.v.preset).toBe('medium')
      expect(constants.VIDEO_DEFAULTS.compress.a.codec).toBe('aac')
      expect(constants.VIDEO_DEFAULTS.compress.a.bitrate).toBe(128)
    })

    it('has convert defaults', () => {
      expect(constants.VIDEO_DEFAULTS.convert.container).toBe('mp4')
      expect(constants.VIDEO_DEFAULTS.convert.v.crf).toBe(23)
    })

    it('has resize defaults', () => {
      expect(constants.VIDEO_DEFAULTS.resize.maxLongEdge).toBe(1280)
      expect(constants.VIDEO_DEFAULTS.resize.a.copy).toBe(true)
    })
  })

  describe('Presets', () => {
    it('defines image quality presets', () => {
      expect(constants.PRESETS.image.lightweight.quality).toBe(0.6)
      expect(constants.PRESETS.image.balanced.quality).toBe(0.75)
      expect(constants.PRESETS.image.highQuality.quality).toBe(0.9)
    })

    it('defines video quality presets', () => {
      expect(constants.PRESETS.video.lightweight.crf).toBe(28)
      expect(constants.PRESETS.video.balanced.crf).toBe(23)
      expect(constants.PRESETS.video.highQuality.crf).toBe(18)
    })

    it('defines size presets', () => {
      expect(constants.PRESETS.size.small.value).toBe(1280)
      expect(constants.PRESETS.size.medium.value).toBe(1920)
      expect(constants.PRESETS.size.large.value).toBe(2560)
    })
  })

  describe('FFmpeg Presets', () => {
    it('includes all ffmpeg preset values', () => {
      expect(constants.FFMPEG_PRESETS).toContain('ultrafast')
      expect(constants.FFMPEG_PRESETS).toContain('medium')
      expect(constants.FFMPEG_PRESETS).toContain('veryslow')
      expect(constants.FFMPEG_PRESETS).toHaveLength(9)
    })
  })

  describe('Supported Formats', () => {
    it('defines supported image formats', () => {
      expect(constants.SUPPORTED_FORMATS.image.input).toContain('image/jpeg')
      expect(constants.SUPPORTED_FORMATS.image.input).toContain('image/png')
      expect(constants.SUPPORTED_FORMATS.image.output).toContain('jpeg')
      expect(constants.SUPPORTED_FORMATS.image.output).toContain('webp')
    })

    it('defines supported video formats', () => {
      expect(constants.SUPPORTED_FORMATS.video.input).toContain('video/mp4')
      expect(constants.SUPPORTED_FORMATS.video.output).toContain('mp4')
      expect(constants.SUPPORTED_FORMATS.video.output).toContain('webm')
    })
  })

  describe('Worker Message Types', () => {
    it('defines all message types', () => {
      expect(constants.WORKER_MESSAGE_TYPES.START).toBe('start')
      expect(constants.WORKER_MESSAGE_TYPES.PROGRESS).toBe('progress')
      expect(constants.WORKER_MESSAGE_TYPES.DONE).toBe('done')
      expect(constants.WORKER_MESSAGE_TYPES.ERROR).toBe('error')
    })
  })

  describe('Task Types', () => {
    it('defines all task types', () => {
      expect(constants.TASK_TYPES.IMAGE_COMPRESS).toBe('image.compress')
      expect(constants.TASK_TYPES.IMAGE_CONVERT).toBe('image.convert')
      expect(constants.TASK_TYPES.IMAGE_RESIZE).toBe('image.resize')
      expect(constants.TASK_TYPES.VIDEO_COMPRESS).toBe('video.compress')
      expect(constants.TASK_TYPES.VIDEO_CONVERT).toBe('video.convert')
      expect(constants.TASK_TYPES.VIDEO_RESIZE).toBe('video.resize')
    })
  })

  describe('Performance Settings', () => {
    it('defines performance constants', () => {
      expect(constants.PERFORMANCE.workerTimeout).toBe(600000)
      expect(constants.PERFORMANCE.progressInterval).toBe(100)
      expect(constants.PERFORMANCE.chunkSize).toBe(1024 * 1024 * 10)
    })
  })

  describe('Error Messages', () => {
    it('defines error messages', () => {
      expect(constants.ERROR_MESSAGES.fileTooLarge).toBe('ファイルサイズが大きすぎます')
      expect(constants.ERROR_MESSAGES.unsupportedFormat).toBe('サポートされていない形式です')
      expect(constants.ERROR_MESSAGES.processingFailed).toBe('処理に失敗しました')
      expect(constants.ERROR_MESSAGES.workerTimeout).toBe('タイムアウトしました')
      expect(constants.ERROR_MESSAGES.wasmNotLoaded).toBe('WASMが読み込まれていません')
    })
  })

  describe('Storage Keys', () => {
    it('defines localStorage keys', () => {
      expect(constants.STORAGE_KEYS.imageCompress).toBe('convertMedia.image.compress')
      expect(constants.STORAGE_KEYS.imageConvert).toBe('convertMedia.image.convert')
      expect(constants.STORAGE_KEYS.imageResize).toBe('convertMedia.image.resize')
      expect(constants.STORAGE_KEYS.videoCompress).toBe('convertMedia.video.compress')
      expect(constants.STORAGE_KEYS.videoConvert).toBe('convertMedia.video.convert')
      expect(constants.STORAGE_KEYS.videoResize).toBe('convertMedia.video.resize')
    })
  })
})