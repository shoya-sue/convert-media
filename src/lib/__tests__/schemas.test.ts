import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  imageCompressSchema,
  imageConvertSchema,
  imageResizeSchema,
  videoCompressSchema,
  videoConvertSchema,
  videoResizeSchema,
  validateImageFile,
  validateVideoFile,
  validateFileSize,
} from '../schemas'

describe('Image Schemas', () => {
  describe('imageCompressSchema', () => {
    it('validates correct compress settings', () => {
      const validData = {
        format: 'jpeg' as const,
        jpeg: { quality: 0.8 },
        effort: 5,
        stripMeta: true,
      }
      
      const result = imageCompressSchema.parse(validData)
      expect(result.format).toBe('jpeg')
      expect(result.jpeg?.quality).toBe(0.8)
    })

    it('provides defaults for optional fields', () => {
      const minimalData = {}
      const result = imageCompressSchema.parse(minimalData)
      
      expect(result.format).toBe('auto')
      expect(result.stripMeta).toBe(true)
      expect(result.effort).toBe(4)
    })

    it('rejects invalid quality values', () => {
      const invalidData = {
        jpeg: { quality: 1.5 }, // > 1
      }
      
      expect(() => imageCompressSchema.parse(invalidData)).toThrow()
    })
  })

  describe('imageConvertSchema', () => {
    it('validates correct convert settings', () => {
      const validData = {
        targetFormat: 'webp' as const,
        webp: { quality: 0.9, lossless: false },
        keepICC: true,
      }
      
      const result = imageConvertSchema.parse(validData)
      expect(result.targetFormat).toBe('webp')
      expect(result.webp?.quality).toBe(0.9)
      expect(result.keepICC).toBe(true)
    })

    it('provides defaults', () => {
      const minimalData = {}
      const result = imageConvertSchema.parse(minimalData)
      
      expect(result.targetFormat).toBe('webp')
      expect(result.keepICC).toBe(false)
    })
  })

  describe('imageResizeSchema', () => {
    it('validates correct resize settings', () => {
      const validData = {
        longEdge: 1920,
        fit: 'contain' as const,
        interpolation: 'lanczos' as const,
        format: 'jpeg' as const,
        quality: 0.85,
      }
      
      const result = imageResizeSchema.parse(validData)
      expect(result.longEdge).toBe(1920)
      expect(result.fit).toBe('contain')
    })

    it('enforces min/max long edge', () => {
      expect(() => imageResizeSchema.parse({ longEdge: 100 })).toThrow() // < 256
      expect(() => imageResizeSchema.parse({ longEdge: 10000 })).toThrow() // > 8192
    })
  })
})

describe('Video Schemas', () => {
  describe('videoCompressSchema', () => {
    it('validates correct compress settings', () => {
      const validData = {
        v: {
          codec: 'h264' as const,
          crf: 23,
          preset: 'medium' as const,
          maxLongEdge: 1920,
        },
        a: {
          codec: 'aac' as const,
          bitrate: 128,
        },
        fpsCap: 30,
        thumbnailPosition: 50,
      }
      
      const result = videoCompressSchema.parse(validData)
      expect(result.v.crf).toBe(23)
      expect(result.a.codec).toBe('aac')
      expect(result.fpsCap).toBe(30)
    })

    it('validates CRF range', () => {
      const invalidCrf = {
        v: { codec: 'h264' as const, crf: 35 }, // > 28
        a: { codec: 'aac' as const },
      }
      
      expect(() => videoCompressSchema.parse(invalidCrf)).toThrow()
    })

    it('allows null for optional fields', () => {
      const validData = {
        v: {
          codec: 'h264' as const,
          crf: 23,
          preset: 'medium' as const,
          maxLongEdge: null,
        },
        a: { codec: 'aac' as const },
        fpsCap: null,
      }
      
      const result = videoCompressSchema.parse(validData)
      expect(result.v.maxLongEdge).toBeNull()
      expect(result.fpsCap).toBeNull()
    })
  })

  describe('videoConvertSchema', () => {
    it('validates correct convert settings', () => {
      const validData = {
        container: 'webm' as const,
        v: { crf: 32, preset: 'fast' as const },
        a: { codec: 'opus' as const, bitrate: 160 },
        thumbnailPosition: 75,
      }
      
      const result = videoConvertSchema.parse(validData)
      expect(result.container).toBe('webm')
      expect(result.a.codec).toBe('opus')
    })

    it('provides defaults', () => {
      const minimalData = {}
      const result = videoConvertSchema.parse(minimalData)
      
      expect(result.container).toBe('mp4')
      expect(result.v.crf).toBe(23)
      expect(result.a.codec).toBe('aac')
    })
  })

  describe('videoResizeSchema', () => {
    it('validates correct resize settings', () => {
      const validData = {
        maxLongEdge: 1280,
        v: { crf: 25, preset: 'slow' as const },
        a: { copy: false, codec: 'aac' as const, bitrate: 192 },
        fpsCap: 24,
        thumbnailPosition: 10,
      }
      
      const result = videoResizeSchema.parse(validData)
      expect(result.maxLongEdge).toBe(1280)
      expect(result.a.copy).toBe(false)
      expect(result.fpsCap).toBe(24)
    })

    it('enforces edge size limits', () => {
      expect(() => videoResizeSchema.parse({ maxLongEdge: 500 })).toThrow() // < 640
      expect(() => videoResizeSchema.parse({ maxLongEdge: 5000 })).toThrow() // > 3840
    })
  })
})

describe('Validation Helpers', () => {
  describe('validateImageFile', () => {
    it('accepts valid image files', () => {
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const pngFile = new File([''], 'test.png', { type: 'image/png' })
      const webpFile = new File([''], 'test.webp', { type: 'image/webp' })
      
      expect(validateImageFile(jpegFile)).toBe(true)
      expect(validateImageFile(pngFile)).toBe(true)
      expect(validateImageFile(webpFile)).toBe(true)
    })

    it('rejects non-image files', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' })
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' })
      
      expect(validateImageFile(textFile)).toBe(false)
      expect(validateImageFile(videoFile)).toBe(false)
    })
  })

  describe('validateVideoFile', () => {
    it('accepts valid video files', () => {
      const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' })
      const webmFile = new File([''], 'test.webm', { type: 'video/webm' })
      
      expect(validateVideoFile(mp4File)).toBe(true)
      expect(validateVideoFile(webmFile)).toBe(true)
    })

    it('rejects non-video files', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const textFile = new File([''], 'test.txt', { type: 'text/plain' })
      
      expect(validateVideoFile(imageFile)).toBe(false)
      expect(validateVideoFile(textFile)).toBe(false)
    })
  })

  describe('validateFileSize', () => {
    it('accepts files within size limit', () => {
      const smallFile = new File(['a'.repeat(1024)], 'test.txt')
      Object.defineProperty(smallFile, 'size', { value: 1024 })
      
      expect(validateFileSize(smallFile, 1)).toBe(true) // 1KB < 1MB
    })

    it('rejects files exceeding size limit', () => {
      const largeFile = new File([''], 'test.txt')
      Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 })
      
      expect(validateFileSize(largeFile, 1)).toBe(false) // 2MB > 1MB
    })

    it('handles exact size limit', () => {
      const exactFile = new File([''], 'test.txt')
      Object.defineProperty(exactFile, 'size', { value: 1024 * 1024 })
      
      expect(validateFileSize(exactFile, 1)).toBe(true) // 1MB = 1MB
    })
  })
})