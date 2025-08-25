import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { BeforeAfter } from '../BeforeAfter'

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('BeforeAfter', () => {
  const user = userEvent.setup()

  it('renders before and after images', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
        beforeLabel="Original"
        afterLabel="Processed"
      />
    )

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(screen.getByText('Original')).toBeInTheDocument()
    expect(screen.getByText('Processed')).toBeInTheDocument()
  })

  it('handles URL strings as image sources', () => {
    render(
      <BeforeAfter
        before="/before.jpg"
        after="/after.jpg"
      />
    )

    const images = screen.getAllByRole('img')
    expect(images[0]).toHaveAttribute('src', '/before.jpg')
    expect(images[1]).toHaveAttribute('src', '/after.jpg')
  })

  it('renders slider control', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    const slider = container.querySelector('input[type="range"]')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')
  })

  it('updates slider position on change', async () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider.value).toBe('50') // Default position

    fireEvent.change(slider, { target: { value: '75' } })
    expect(slider.value).toBe('75')
  })

  it('applies custom className', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
        className="custom-comparison"
      />
    )

    expect(container.querySelector('.custom-comparison')).toBeInTheDocument()
  })

  it('handles mouse drag to move slider', async () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    const sliderHandle = container.querySelector('.sliderHandle')
    expect(sliderHandle).toBeInTheDocument()

    // Simulate drag
    fireEvent.mouseDown(sliderHandle!)
    fireEvent.mouseMove(document, { clientX: 100 })
    fireEvent.mouseUp(document)
  })

  it('handles touch events for mobile', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    const sliderHandle = container.querySelector('.sliderHandle')
    
    // Simulate touch
    fireEvent.touchStart(sliderHandle!, {
      touches: [{ clientX: 50 } as Touch],
    })
    fireEvent.touchMove(document, {
      touches: [{ clientX: 100 } as Touch],
    })
    fireEvent.touchEnd(document)
  })

  it('displays default labels when not provided', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })

  it('cleans up blob URLs on unmount', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { unmount } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    unmount()
    
    // Should revoke both blob URLs
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('sets initial slider position', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
        initialPosition={30}
      />
    )

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider.value).toBe('30')
  })

  it('limits slider position to valid range', async () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    
    // Try to set value beyond range
    fireEvent.change(slider, { target: { value: '150' } })
    expect(parseInt(slider.value)).toBeLessThanOrEqual(100)
    
    fireEvent.change(slider, { target: { value: '-50' } })
    expect(parseInt(slider.value)).toBeGreaterThanOrEqual(0)
  })

  it('updates clip path on slider change', () => {
    const beforeBlob = new Blob(['before'], { type: 'image/jpeg' })
    const afterBlob = new Blob(['after'], { type: 'image/jpeg' })
    
    const { container } = render(
      <BeforeAfter
        before={beforeBlob}
        after={afterBlob}
      />
    )

    const afterContainer = container.querySelector('.afterContainer') as HTMLElement
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    
    fireEvent.change(slider, { target: { value: '25' } })
    
    // Check if clip path is updated (exact style check depends on implementation)
    expect(afterContainer).toHaveStyle({ clipPath: expect.stringContaining('25') })
  })
})