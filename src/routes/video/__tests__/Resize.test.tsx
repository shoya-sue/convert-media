import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Resize from '../Resize'

// Mock worker
vi.mock('../../../lib/video', () => ({
  processVideos: vi.fn().mockResolvedValue([
    {
      blob: new Blob(['test'], { type: 'video/mp4' }),
      name: 'test_resized.mp4',
      originalSize: 10000000,
      size: 5000000,
    },
  ]),
  checkFfmpegAvailability: vi.fn().mockResolvedValue(true),
  isFfmpegAvailable: vi.fn().mockResolvedValue(true),
  generateVideoThumbnail: vi.fn().mockResolvedValue(new Blob(['thumbnail'], { type: 'image/jpeg' })),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('Video Resize Page', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page with all elements', () => {
    render(<Resize />)

    // タイトルとコンテナの確認
    expect(screen.getByText(/動画リサイズ/)).toBeInTheDocument()
    expect(screen.getByText(/動画の解像度を変更/)).toBeInTheDocument()

    // ドロップゾーンの確認
    expect(screen.getByText(/ここに動画ファイルをドロップ/)).toBeInTheDocument()

    // 設定フォームの確認
    expect(screen.getByLabelText(/長辺サイズ/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/映像品質/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/音声設定/i)).toBeInTheDocument()
  })

  it('loads saved settings from localStorage', () => {
    const savedSettings = {
      maxLongEdge: 1920,
      videoCrf: 25,
      audioMode: 'reencode',
      audioBitrate: 192,
      thumbnailPosition: 25,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))

    render(<Resize />)

    // 保存された設定が反映されているか確認
    const sizeInput = screen.getByLabelText(/長辺サイズ/i) as HTMLInputElement
    expect(sizeInput.value).toBe('1920')

    const crfInput = screen.getByLabelText(/映像品質/i) as HTMLInputElement
    expect(crfInput.value).toBe('25')
  })

  it('saves settings to localStorage when changed', async () => {
    render(<Resize />)

    // 設定を変更
    const sizeInput = screen.getByLabelText(/長辺サイズ/i)
    await user.clear(sizeInput)
    await user.type(sizeInput, '2560')

    // localStorageに保存されているか確認
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'convertMedia.video.resize',
        expect.stringContaining('2560')
      )
    })
  })

  it('handles size preset selection', async () => {
    render(<Resize />)

    // プリセットボタンの確認
    const smallPreset = screen.getByText('小 (1280px)')
    const mediumPreset = screen.getByText('中 (1920px)')
    const largePreset = screen.getByText('大 (2560px)')

    expect(smallPreset).toBeInTheDocument()
    expect(mediumPreset).toBeInTheDocument()
    expect(largePreset).toBeInTheDocument()

    // 小サイズプリセットをクリック
    await user.click(smallPreset)

    // 値が変更されているか確認
    const sizeInput = screen.getByLabelText(/長辺サイズ/i) as HTMLInputElement
    expect(sizeInput.value).toBe('1280')

    // 大サイズプリセットをクリック
    await user.click(largePreset)
    expect(sizeInput.value).toBe('2560')
  })

  it('handles file drop correctly', async () => {
    const { container } = render(<Resize />)

    // ファイルを作成
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement

    // ドロップイベントをシミュレート
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }

    fireEvent.drop(dropzone, { dataTransfer })

    // ファイルが表示されているか確認
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument()
    })
  })

  it('processes video resize when start button is clicked', async () => {
    const { container } = render(<Resize />)
    const { processVideos } = await import('../../../lib/video')

    // ファイルを追加
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    // 処理開始ボタンをクリック
    await waitFor(() => {
      const startButton = screen.getByText(/リサイズ開始/i)
      expect(startButton).toBeInTheDocument()
    })

    const startButton = screen.getByText(/リサイズ開始/i)
    await user.click(startButton)

    // processVideosが呼ばれたか確認
    await waitFor(() => {
      expect(processVideos).toHaveBeenCalledWith(
        expect.arrayContaining([file]),
        'resize',
        expect.objectContaining({
          maxLongEdge: expect.any(Number),
        })
      )
    })
  })

  it('displays results with size reduction after processing', async () => {
    const { container } = render(<Resize />)
    const { processVideos } = await import('../../../lib/video')

    // ファイルを追加して処理
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    const startButton = await screen.findByText(/リサイズ開始/i)
    await user.click(startButton)

    // 結果が表示されているか確認
    await waitFor(() => {
      expect(screen.getByText(/リサイズ完了/i)).toBeInTheDocument()
      expect(screen.getByText(/test_resized.mp4/i)).toBeInTheDocument()
      // サイズ削減率が表示されているか
      expect(screen.getByText(/-50%/)).toBeInTheDocument()
    })
  })

  it('handles audio copy mode correctly', async () => {
    render(<Resize />)

    // 音声コピーモードを選択
    const audioCopyRadio = screen.getByLabelText(/音声をコピー/i)
    await user.click(audioCopyRadio)

    // ビットレート設定が無効になっているか確認
    const bitrateInput = screen.queryByLabelText(/音声ビットレート/i)
    if (bitrateInput) {
      expect(bitrateInput).toBeDisabled()
    }
  })

  it('handles audio reencode mode correctly', async () => {
    render(<Resize />)

    // 音声再エンコードモードを選択
    const audioReencodeRadio = screen.getByLabelText(/音声を再エンコード/i)
    await user.click(audioReencodeRadio)

    // ビットレート設定が有効になっているか確認
    const bitrateInput = screen.getByLabelText(/音声ビットレート/i)
    expect(bitrateInput).not.toBeDisabled()
  })

  it('validates long edge input', async () => {
    render(<Resize />)

    const sizeInput = screen.getByLabelText(/長辺サイズ/i)

    // 最小値以下を入力
    await user.clear(sizeInput)
    await user.type(sizeInput, '500')

    // 値が最小値に制限されているか確認（640以上）
    const input = sizeInput as HTMLInputElement
    expect(parseInt(input.value)).toBeGreaterThanOrEqual(640)

    // 最大値を超える値を入力
    await user.clear(sizeInput)
    await user.type(sizeInput, '5000')

    // 値が最大値に制限されているか確認（3840以下）
    expect(parseInt(input.value)).toBeLessThanOrEqual(3840)
  })

  it('generates thumbnails when requested', async () => {
    const { container } = render(<Resize />)
    const { generateVideoThumbnail } = await import('../../../lib/video')

    // ファイルを追加
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    // サムネイル位置を変更
    const thumbnailSlider = screen.getByLabelText(/サムネイル位置/i)
    fireEvent.change(thumbnailSlider, { target: { value: '75' } })

    // 処理開始
    const startButton = await screen.findByText(/リサイズ開始/i)
    await user.click(startButton)

    // generateVideoThumbnailが呼ばれたか確認
    await waitFor(() => {
      expect(generateVideoThumbnail).toHaveBeenCalled()
    })
  })

  it('displays error message when ffmpeg is not available', async () => {
    const { isFfmpegAvailable } = await import('../../../lib/video')
    ;(isFfmpegAvailable as any).mockResolvedValue(false)

    render(<Resize />)

    // エラーメッセージが表示されているか確認
    await waitFor(() => {
      expect(screen.getByText(/ffmpeg.wasm が配置されていません/i)).toBeInTheDocument()
    })
  })

  it('handles multiple files correctly', async () => {
    const { container } = render(<Resize />)

    // 複数ファイルを作成
    const files = [
      new File(['video1'], 'video1.mp4', { type: 'video/mp4' }),
      new File(['video2'], 'video2.mp4', { type: 'video/mp4' }),
      new File(['video3'], 'video3.webm', { type: 'video/webm' }),
    ]

    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files,
      items: files.map(f => ({ kind: 'file', getAsFile: () => f })),
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    // すべてのファイルが表示されているか確認
    await waitFor(() => {
      expect(screen.getByText('video1.mp4')).toBeInTheDocument()
      expect(screen.getByText('video2.mp4')).toBeInTheDocument()
      expect(screen.getByText('video3.webm')).toBeInTheDocument()
    })
  })

  it('handles FPS cap selection', async () => {
    render(<Resize />)

    // FPS制限を有効にする
    const fpsCheckbox = screen.getByLabelText(/FPS制限/i)
    await user.click(fpsCheckbox)

    // FPSセレクトが表示されるか確認
    const fpsSelect = screen.getByLabelText(/最大FPS/i)
    expect(fpsSelect).toBeInTheDocument()

    // 30 FPSを選択
    await user.selectOptions(fpsSelect, '30')
    expect((fpsSelect as HTMLSelectElement).value).toBe('30')
  })

  it('clears files when clear button is clicked', async () => {
    const { container } = render(<Resize />)

    // ファイルを追加
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    // ファイルが表示されているか確認
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument()
    })

    // クリアボタンをクリック
    const clearButton = screen.getByText(/クリア/i)
    await user.click(clearButton)

    // ファイルが削除されているか確認
    expect(screen.queryByText('test.mp4')).not.toBeInTheDocument()
  })

  it('downloads resized files when download button is clicked', async () => {
    const { container } = render(<Resize />)

    // ファイルを追加して処理
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    const startButton = await screen.findByText(/リサイズ開始/i)
    await user.click(startButton)

    // ダウンロードボタンが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/ダウンロード/i)).toBeInTheDocument()
    })

    // ダウンロードリンクのクリックをシミュレート
    const downloadButton = screen.getByText(/ダウンロード/i)
    expect(downloadButton.closest('a')).toHaveAttribute('download')
  })

  it('shows custom size input when custom preset is selected', async () => {
    render(<Resize />)

    // カスタムプリセットを選択
    const customPreset = screen.getByText(/カスタム/i)
    await user.click(customPreset)

    // カスタムサイズ入力が有効になっているか確認
    const sizeInput = screen.getByLabelText(/長辺サイズ/i) as HTMLInputElement
    expect(sizeInput).not.toBeDisabled()
    expect(sizeInput).toHaveFocus()
  })
})