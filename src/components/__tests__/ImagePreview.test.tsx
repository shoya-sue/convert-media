import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ImagePreview } from '../ImagePreview'

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('ImagePreview', () => {
  it('renders single image preview', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    render(<ImagePreview src={blob} alt="Test image" />)
    
    const img = screen.getByAltText('Test image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'blob:mock-url')
  })

  it('renders before/after comparison', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    render(
      <ImagePreview
        before={beforeBlob}
        after={afterBlob}
        alt="Comparison"
      />
    )

    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
    
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
  })

  it('displays file size information', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    render(
      <ImagePreview
        src={blob}
        alt="Test"
        originalSize={1024 * 1024}
        currentSize={512 * 1024}
      />
    )

    expect(screen.getByText(/1.0 MB/)).toBeInTheDocument()
    expect(screen.getByText(/512.0 KB/)).toBeInTheDocument()
  })

  it('shows size reduction percentage', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    render(
      <ImagePreview
        src={blob}
        alt="Test"
        originalSize={1000000}
        currentSize={500000}
        showReduction
      />
    )

    expect(screen.getByText(/-50%/)).toBeInTheDocument()
  })

  it('renders download link when showDownload is true', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    render(
      <ImagePreview
        src={blob}
        alt="Test"
        showDownload
        fileName="test.jpg"
      />
    )

    const downloadLink = screen.getByText(/ダウンロード/)
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink.closest('a')).toHaveAttribute('download', 'test.jpg')
  })

  it('applies custom className', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const { container } = render(
      <ImagePreview
        src={blob}
        alt="Test"
        className="custom-class"
      />
    )

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('handles URL string as src', () => {
    render(<ImagePreview src="/test.jpg" alt="Test" />)
    
    const img = screen.getByAltText('Test')
    expect(img).toHaveAttribute('src', '/test.jpg')
  })

  it('cleans up blob URLs on unmount', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const { unmount } = render(<ImagePreview src={blob} alt="Test" />)
    
    unmount()
    
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('renders loading state', () => {
    render(<ImagePreview src={null} alt="Test" loading />)
    
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument()
  })

  it('formats file sizes correctly', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    
    // Test KB range
    const { rerender } = render(
      <ImagePreview
        src={blob}
        alt="Test"
        originalSize={500}
        currentSize={250}
      />
    )
    expect(screen.getByText(/500 B/)).toBeInTheDocument()
    expect(screen.getByText(/250 B/)).toBeInTheDocument()

    // Test MB range
    rerender(
      <ImagePreview
        src={blob}
        alt="Test"
        originalSize={5 * 1024 * 1024}
        currentSize={2.5 * 1024 * 1024}
      />
    )
    expect(screen.getByText(/5.0 MB/)).toBeInTheDocument()
    expect(screen.getByText(/2.5 MB/)).toBeInTheDocument()
  })
})