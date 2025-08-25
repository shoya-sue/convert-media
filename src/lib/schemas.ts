/**
 * Zodスキーマの統一管理
 */
import { z } from 'zod'

// 画像圧縮スキーマ
export const imageCompressSchema = z.object({
  format: z.enum(['auto', 'jpeg', 'png', 'webp', 'avif']).default('auto'),
  jpeg: z
    .object({
      quality: z.number().min(0).max(1).default(0.75),
      baseline: z.boolean().default(true),
      chroma: z.enum(['4:2:0', '4:4:4']).default('4:2:0'),
    })
    .partial(),
  png: z
    .object({
      lossless: z.boolean().default(true),
      level: z.number().int().min(0).max(9).default(3),
    })
    .partial(),
  webp: z
    .object({
      quality: z.number().min(0).max(1).default(0.75),
      lossless: z.boolean().default(false),
      effort: z.number().int().min(0).max(9).default(4),
    })
    .partial(),
  avif: z
    .object({
      cq: z.number().int().min(0).max(63).default(30),
      effort: z.number().int().min(0).max(9).default(4),
    })
    .partial(),
  effort: z.number().int().min(0).max(9).default(4),
  stripMeta: z.boolean().default(true),
})

export type ImageCompressSchema = z.infer<typeof imageCompressSchema>

// 画像変換スキーマ
export const imageConvertSchema = z.object({
  targetFormat: z.enum(['jpeg', 'png', 'webp', 'avif']).default('webp'),
  jpeg: z
    .object({
      quality: z.number().min(0).max(1).default(0.8),
      baseline: z.boolean().default(true),
      chroma: z.enum(['4:2:0', '4:4:4']).default('4:2:0'),
    })
    .partial(),
  png: z
    .object({
      lossless: z.boolean().default(true),
      level: z.number().int().min(0).max(9).default(3),
    })
    .partial(),
  webp: z
    .object({
      quality: z.number().min(0).max(1).default(0.8),
      lossless: z.boolean().default(false),
      effort: z.number().int().min(0).max(9).default(4),
    })
    .partial(),
  avif: z
    .object({
      cq: z.number().int().min(0).max(63).default(28),
      effort: z.number().int().min(0).max(9).default(4),
    })
    .partial(),
  keepICC: z.boolean().default(false),
  keepEXIF: z.boolean().default(false),
})

export type ImageConvertSchema = z.infer<typeof imageConvertSchema>

// 画像リサイズスキーマ
export const imageResizeSchema = z.object({
  longEdge: z.number().int().min(256).max(8192).default(1920),
  fit: z.enum(['contain', 'cover']).default('contain'),
  interpolation: z.enum(['lanczos', 'bilinear', 'cubic', 'nearest']).default('lanczos'),
  format: z.enum(['auto', 'jpeg', 'png', 'webp', 'avif']).default('auto'),
  quality: z.number().min(0).max(1).default(0.8).optional(),
  effort: z.number().int().min(0).max(9).default(4).optional(),
})

export type ImageResizeSchema = z.infer<typeof imageResizeSchema>

// 動画圧縮スキーマ
export const videoCompressSchema = z.object({
  v: z.object({
    codec: z.literal('h264').default('h264'),
    crf: z.number().int().min(18).max(28).default(23),
    preset: z
      .enum([
        'ultrafast',
        'superfast',
        'veryfast',
        'faster',
        'fast',
        'medium',
        'slow',
        'slower',
        'veryslow',
      ])
      .default('medium'),
    maxLongEdge: z.number().int().min(640).max(3840).nullable().default(null),
  }),
  a: z.object({
    codec: z.enum(['aac', 'opus', 'none']).default('aac'),
    bitrate: z.number().int().min(64).max(192).default(128),
  }),
  fpsCap: z
    .union([z.literal(24), z.literal(30), z.literal(60)])
    .nullable()
    .default(null),
  thumbnailPosition: z.number().min(0).max(100).default(10),
})

export type VideoCompressSchema = z.infer<typeof videoCompressSchema>

// 動画変換スキーマ
export const videoConvertSchema = z.object({
  container: z.enum(['mp4', 'webm']).default('mp4'),
  v: z.object({
    crf: z.number().int().min(18).max(38).default(23), // WebMの場合は28-38
    preset: z
      .enum([
        'ultrafast',
        'superfast',
        'veryfast',
        'faster',
        'fast',
        'medium',
        'slow',
        'slower',
        'veryslow',
      ])
      .default('medium'),
  }),
  a: z.object({
    codec: z.enum(['aac', 'opus']).default('aac'),
    bitrate: z.number().int().min(64).max(192).default(128),
  }),
  thumbnailPosition: z.number().min(0).max(100).default(10),
})

export type VideoConvertSchema = z.infer<typeof videoConvertSchema>

// 動画リサイズスキーマ
export const videoResizeSchema = z.object({
  maxLongEdge: z.number().int().min(640).max(3840).default(1280),
  v: z.object({
    crf: z.number().int().min(18).max(28).default(23),
    preset: z
      .enum([
        'ultrafast',
        'superfast',
        'veryfast',
        'faster',
        'fast',
        'medium',
        'slow',
        'slower',
        'veryslow',
      ])
      .default('medium'),
  }),
  a: z.object({
    copy: z.boolean().default(true),
    codec: z.enum(['aac', 'opus']).default('aac'),
    bitrate: z.number().int().min(64).max(192).default(128),
  }),
  fpsCap: z
    .union([z.literal(24), z.literal(30), z.literal(60)])
    .nullable()
    .default(null),
  thumbnailPosition: z.number().min(0).max(100).default(10),
})

export type VideoResizeSchema = z.infer<typeof videoResizeSchema>

// ファイルバリデーションスキーマ
export const fileValidationSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().positive(),
  data: z.instanceof(ArrayBuffer).optional(),
})

export type FileValidation = z.infer<typeof fileValidationSchema>

// Worker メッセージスキーマ
export const workerStartMessageSchema = z.object({
  type: z.literal('start'),
  task: z.enum([
    'image.compress',
    'image.convert',
    'image.resize',
    'video.compress',
    'video.convert',
    'video.resize',
  ]),
  files: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      data: z.instanceof(ArrayBuffer),
    })
  ),
  params: z.unknown(),
})

export type WorkerStartMessage = z.infer<typeof workerStartMessageSchema>

export const workerProgressMessageSchema = z.object({
  type: z.literal('progress'),
  task: z.string(),
  progress: z.number().min(0).max(1),
  details: z.record(z.unknown()).optional(),
})

export type WorkerProgressMessage = z.infer<typeof workerProgressMessageSchema>

export const workerDoneMessageSchema = z.object({
  type: z.literal('done'),
  task: z.string(),
  results: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      data: z.instanceof(ArrayBuffer),
    })
  ),
})

export type WorkerDoneMessage = z.infer<typeof workerDoneMessageSchema>

export const workerErrorMessageSchema = z.object({
  type: z.literal('error'),
  task: z.string(),
  error: z.string(),
})

export type WorkerErrorMessage = z.infer<typeof workerErrorMessageSchema>

export type WorkerMessage =
  | WorkerStartMessage
  | WorkerProgressMessage
  | WorkerDoneMessage
  | WorkerErrorMessage

// フォームプリセットスキーマ
export const presetSchema = z.enum(['lightweight', 'balanced', 'highQuality'])
export type Preset = z.infer<typeof presetSchema>

export const sizePresetSchema = z.enum(['small', 'medium', 'large'])
export type SizePreset = z.infer<typeof sizePresetSchema>

// バリデーションヘルパー
export function validateImageFile(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  return supportedTypes.includes(file.type)
}

export function validateVideoFile(file: File): boolean {
  const supportedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
  return supportedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}