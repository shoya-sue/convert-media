import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Dropzone } from '../Dropzone'

describe('Dropzone', () => {
  it('renders with default text', () => {
    render(<Dropzone onDrop={vi.fn()} accept={['image/*']} />)
    expect(screen.getByText(/ここに画像ファイルをドロップ/)).toBeInTheDocument()
  })

  it('renders with video text when accepting video files', () => {
    render(<Dropzone onDrop={vi.fn()} accept={['video/*']} />)
    expect(screen.getByText(/ここに動画ファイルをドロップ/)).toBeInTheDocument()
  })

  it('calls onDrop when files are dropped', async () => {
    const onDrop = vi.fn()
    const { container } = render(<Dropzone onDrop={onDrop} accept={['image/*']} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const dropzone = container.querySelector('.dropzone') as HTMLElement

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files'],
    }

    fireEvent.drop(dropzone, { dataTransfer })

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalledWith([file])
    })
  })

  it('shows drag over state when dragging files', () => {
    const { container } = render(<Dropzone onDrop={vi.fn()} accept={['image/*']} />)
    const dropzone = container.querySelector('.dropzone') as HTMLElement

    fireEvent.dragEnter(dropzone)
    expect(dropzone).toHaveClass('dragOver')

    fireEvent.dragLeave(dropzone)
    expect(dropzone).not.toHaveClass('dragOver')
  })

  it('filters files by accept prop', async () => {
    const onDrop = vi.fn()
    const { container } = render(<Dropzone onDrop={onDrop} accept={['image/jpeg']} />)

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const invalidFile = new File(['test'], 'test.png', { type: 'image/png' })
    
    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files: [validFile, invalidFile],
      items: [
        { kind: 'file', getAsFile: () => validFile },
        { kind: 'file', getAsFile: () => invalidFile },
      ],
      types: ['Files'],
    }

    fireEvent.drop(dropzone, { dataTransfer })

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalledWith([validFile])
    })
  })

  it('handles multiple files when multiple prop is true', async () => {
    const onDrop = vi.fn()
    const { container } = render(
      <Dropzone onDrop={onDrop} accept={['image/*']} multiple />
    )

    const files = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
    ]

    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files,
      items: files.map(f => ({ kind: 'file', getAsFile: () => f })),
      types: ['Files'],
    }

    fireEvent.drop(dropzone, { dataTransfer })

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalledWith(files)
    })
  })

  it('limits to single file when multiple prop is false', async () => {
    const onDrop = vi.fn()
    const { container } = render(
      <Dropzone onDrop={onDrop} accept={['image/*']} multiple={false} />
    )

    const files = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
    ]

    const dropzone = container.querySelector('.dropzone') as HTMLElement
    const dataTransfer = {
      files,
      items: files.map(f => ({ kind: 'file', getAsFile: () => f })),
      types: ['Files'],
    }

    fireEvent.drop(dropzone, { dataTransfer })

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalledWith([files[0]])
    })
  })

  it('handles file input change event', async () => {
    const onDrop = vi.fn()
    render(<Dropzone onDrop={onDrop} accept={['image/*']} />)

    const input = screen.getByLabelText(/ファイルを選択/) as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalledWith([file])
    })
  })

  it('prevents default drag behaviors', () => {
    const { container } = render(<Dropzone onDrop={vi.fn()} accept={['image/*']} />)
    const dropzone = container.querySelector('.dropzone') as HTMLElement

    const dragOver = new Event('dragover', { bubbles: true, cancelable: true })
    const preventDefault = vi.spyOn(dragOver, 'preventDefault')
    
    fireEvent(dropzone, dragOver)
    expect(preventDefault).toHaveBeenCalled()
  })
})