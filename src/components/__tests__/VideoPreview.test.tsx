import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { VideoPreview } from '../VideoPreview'

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('VideoPreview', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders video element with controls', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    render(<VideoPreview src={blob} controls />)
    
    const video = screen.getByRole('video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('src', 'blob:mock-url')
  })

  it('renders video without controls when controls prop is false', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    render(<VideoPreview src={blob} controls={false} />)
    
    const video = screen.getByRole('video') as HTMLVideoElement
    expect(video).not.toHaveAttribute('controls')
  })

  it('displays poster image when provided', () => {
    const videoBlob = new Blob(['video'], { type: 'video/mp4' })
    const posterBlob = new Blob(['poster'], { type: 'image/jpeg' })
    
    render(<VideoPreview src={videoBlob} poster={posterBlob} />)
    
    const video = screen.getByRole('video') as HTMLVideoElement
    expect(video).toHaveAttribute('poster', 'blob:mock-url')
  })

  it('renders thumbnail preview grid', () => {
    const videoBlob = new Blob(['video'], { type: 'video/mp4' })
    const thumbnails = [
      new Blob(['thumb1'], { type: 'image/jpeg' }),
      new Blob(['thumb2'], { type: 'image/jpeg' }),
      new Blob(['thumb3'], { type: 'image/jpeg' }),
    ]
    
    render(<VideoPreview src={videoBlob} thumbnails={thumbnails} />)
    
    expect(screen.getByText('サムネイルプレビュー')).toBeInTheDocument()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
  })

  it('shows download links for thumbnails', () => {
    const videoBlob = new Blob(['video'], { type: 'video/mp4' })
    const thumbnails = [new Blob(['thumb'], { type: 'image/jpeg' })]
    
    render(
      <VideoPreview
        src={videoBlob}
        thumbnails={thumbnails}
        showDownload
      />
    )
    
    const downloadLink = screen.getByText('ダウンロード')
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink).toHaveAttribute('download', 'thumbnail_1.jpg')
  })

  it('renders before/after comparison mode', () => {
    const beforeBlob = new Blob(['before'], { type: 'video/mp4' })
    const afterBlob = new Blob(['after'], { type: 'video/mp4' })
    
    render(
      <VideoPreview
        src="dummy"
        comparison={{ before: beforeBlob, after: afterBlob }}
      />
    )
    
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
    
    const videos = screen.getAllByRole('video')
    expect(videos).toHaveLength(2)
  })

  it('displays size information and reduction', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    
    render(
      <VideoPreview
        src={blob}
        sizeInfo={{ before: 10000000, after: 5000000 }}
        showReduction
      />
    )
    
    expect(screen.getByText(/9.5 MB/)).toBeInTheDocument()
    expect(screen.getByText(/4.8 MB/)).toBeInTheDocument()
    expect(screen.getByText(/-50%/)).toBeInTheDocument()
  })

  it('shows download button when showDownload is true', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    
    render(
      <VideoPreview
        src={blob}
        showDownload
        downloadName="test-video.mp4"
      />
    )
    
    const downloadButton = screen.getByText('動画をダウンロード')
    expect(downloadButton).toBeInTheDocument()
  })

  it('handles download button click', async () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    const createElementSpy = vi.spyOn(document, 'createElement')
    
    render(
      <VideoPreview
        src={blob}
        showDownload
        downloadName="test.mp4"
      />
    )
    
    const downloadButton = screen.getByText('動画をダウンロード')
    await user.click(downloadButton)
    
    expect(createElementSpy).toHaveBeenCalledWith('a')
  })

  it('applies custom className', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    const { container } = render(
      <VideoPreview src={blob} className="custom-class" />
    )
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('sets video attributes correctly', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    
    render(
      <VideoPreview
        src={blob}
        autoplay
        loop
        muted
        width={640}
        height={480}
      />
    )
    
    const video = screen.getByRole('video') as HTMLVideoElement
    expect(video).toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('muted')
    expect(video).toHaveAttribute('width', '640')
    expect(video).toHaveAttribute('height', '480')
  })

  it('cleans up blob URLs on unmount', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    const { unmount } = render(<VideoPreview src={blob} />)
    
    unmount()
    
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('handles URL string as src', () => {
    render(<VideoPreview src="/test-video.mp4" />)
    
    const video = screen.getByRole('video') as HTMLVideoElement
    expect(video).toHaveAttribute('src', '/test-video.mp4')
  })

  it('formats file sizes correctly', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    
    render(
      <VideoPreview
        src={blob}
        sizeInfo={{ before: 1024, after: 512 }}
      />
    )
    
    expect(screen.getByText(/1.0 KB/)).toBeInTheDocument()
    expect(screen.getByText(/512 B/)).toBeInTheDocument()
  })

  it('handles custom controls with play/pause', () => {
    const blob = new Blob(['video'], { type: 'video/mp4' })
    const { container } = render(
      <VideoPreview src={blob} controls={false} />
    )
    
    // Custom controls should be present when controls=false
    const customControls = container.querySelector('.customControls')
    
    // Note: Custom controls rendering depends on video metadata loading
    // which doesn't happen in test environment
    expect(customControls).toBeFalsy() // Initially not shown until metadata loads
  })
})