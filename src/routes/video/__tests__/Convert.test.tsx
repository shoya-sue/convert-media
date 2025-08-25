import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Convert from '../Convert'

// Mock worker
vi.mock('../../../lib/video', () => ({
  processVideos: vi.fn().mockResolvedValue([
    {
      blob: new Blob(['test'], { type: 'video/mp4' }),
      name: 'test_converted.mp4',
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

describe('Video Convert Page', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page with all elements', () => {
    render(<Convert />)

    // タイトルとコンテナの確認
    expect(screen.getByText(/動画変換/)).toBeInTheDocument()
    expect(screen.getByText(/MP4.*WebM/)).toBeInTheDocument()

    // ドロップゾーンの確認
    expect(screen.getByText(/ここに動画ファイルをドロップ/)).toBeInTheDocument()

    // 設定フォームの確認
    expect(screen.getByLabelText(/出力形式/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/映像品質/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/音声ビットレート/i)).toBeInTheDocument()
  })

  it('loads saved settings from localStorage', () => {
    const savedSettings = {
      container: 'webm',
      videoCrf: 32,
      audioCodec: 'opus',
      audioBitrate: 160,
      thumbnailPosition: 50,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))

    render(<Convert />)

    // 保存された設定が反映されているか確認
    const containerSelect = screen.getByLabelText(/出力形式/i) as HTMLSelectElement
    expect(containerSelect.value).toBe('webm')

    const crfInput = screen.getByLabelText(/映像品質/i) as HTMLInputElement
    expect(crfInput.value).toBe('32')
  })

  it('saves settings to localStorage when changed', async () => {
    render(<Convert />)

    // 設定を変更
    const containerSelect = screen.getByLabelText(/出力形式/i)
    await user.selectOptions(containerSelect, 'webm')

    // localStorageに保存されているか確認
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'convertMedia.video.convert',
        expect.stringContaining('webm')
      )
    })
  })

  it('handles file drop correctly', async () => {
    const { container } = render(<Convert />)

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

  it('processes video conversion when start button is clicked', async () => {
    const { container } = render(<Convert />)
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
      const startButton = screen.getByText(/変換開始/i)
      expect(startButton).toBeInTheDocument()
    })

    const startButton = screen.getByText(/変換開始/i)
    await user.click(startButton)

    // processVideosが呼ばれたか確認
    await waitFor(() => {
      expect(processVideos).toHaveBeenCalledWith(
        expect.arrayContaining([file]),
        'convert',
        expect.objectContaining({
          container: expect.any(String),
        })
      )
    })
  })

  it('displays results after processing', async () => {
    const { container } = render(<Convert />)
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

    const startButton = await screen.findByText(/変換開始/i)
    await user.click(startButton)

    // 結果が表示されているか確認
    await waitFor(() => {
      expect(screen.getByText(/変換完了/i)).toBeInTheDocument()
      expect(screen.getByText(/test_converted.mp4/i)).toBeInTheDocument()
    })
  })

  it('handles WebM container selection correctly', async () => {
    render(<Convert />)

    // WebMを選択
    const containerSelect = screen.getByLabelText(/出力形式/i)
    await user.selectOptions(containerSelect, 'webm')

    // CRF範囲が変更されているか確認（WebMは28-38）
    const crfInput = screen.getByLabelText(/映像品質/i) as HTMLInputElement
    expect(crfInput.min).toBe('28')
    expect(crfInput.max).toBe('38')
  })

  it('handles MP4 container selection correctly', async () => {
    render(<Convert />)

    // MP4を選択
    const containerSelect = screen.getByLabelText(/出力形式/i)
    await user.selectOptions(containerSelect, 'mp4')

    // CRF範囲が正しいか確認（MP4は18-28）
    const crfInput = screen.getByLabelText(/映像品質/i) as HTMLInputElement
    expect(crfInput.min).toBe('18')
    expect(crfInput.max).toBe('28')
  })

  it('generates thumbnails when requested', async () => {
    const { container } = render(<Convert />)
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
    fireEvent.change(thumbnailSlider, { target: { value: '50' } })

    // 処理開始
    const startButton = await screen.findByText(/変換開始/i)
    await user.click(startButton)

    // generateVideoThumbnailが呼ばれたか確認
    await waitFor(() => {
      expect(generateVideoThumbnail).toHaveBeenCalled()
    })
  })

  it('displays error message when ffmpeg is not available', async () => {
    const { isFfmpegAvailable } = await import('../../../lib/video')
    ;(isFfmpegAvailable as any).mockResolvedValue(false)

    render(<Convert />)

    // エラーメッセージが表示されているか確認
    await waitFor(() => {
      expect(screen.getByText(/ffmpeg.wasm が配置されていません/i)).toBeInTheDocument()
    })
  })

  it('handles multiple files correctly', async () => {
    const { container } = render(<Convert />)

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

  it('clears files when clear button is clicked', async () => {
    const { container } = render(<Convert />)

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

  it('downloads converted files when download button is clicked', async () => {
    const { container } = render(<Convert />)

    // ファイルを追加して処理
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }
    fireEvent.drop(dropzone, { dataTransfer })

    const startButton = await screen.findByText(/変換開始/i)
    await user.click(startButton)

    // ダウンロードボタンが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/ダウンロード/i)).toBeInTheDocument()
    })

    // ダウンロードリンクのクリックをシミュレート
    const downloadButton = screen.getByText(/ダウンロード/i)
    expect(downloadButton.closest('a')).toHaveAttribute('download')
  })
})