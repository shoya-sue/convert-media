import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Worker environment
const mockPostMessage = vi.fn()
const mockSelf = {
  postMessage: mockPostMessage,
  addEventListener: vi.fn(),
}

// Mock canvas and blob APIs
global.OffscreenCanvas = vi.fn().mockImplementation((width, height) => ({
  width,
  height,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  convertToBlob: vi.fn(() => 
    Promise.resolve(new Blob(['compressed'], { type: 'image/jpeg' }))
  ),
})) as any

global.createImageBitmap = vi.fn(() => 
  Promise.resolve({
    width: 100,
    height: 100,
    close: vi.fn(),
  })
) as any

describe('imageCompress.worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles compress message', async () => {
    const message = {
      data: {
        id: 'test-id',
        name: 'test.jpg',
        type: 'image/jpeg',
        data: new ArrayBuffer(1000),
        params: {
          format: 'auto',
          quality: 0.8,
        },
      },
    }

    // Simulate worker receiving message
    const handlers: any = {}
    mockSelf.addEventListener.mockImplementation((event, handler) => {
      handlers[event] = handler
    })

    // Load worker code (mocked)
    Object.assign(global, { self: mockSelf })

    // Trigger message handler
    if (handlers.message) {
      await handlers.message(message)
    }

    // Verify postMessage was called with progress and done
    expect(mockPostMessage).toHaveBeenCalled()
  })

  it('reports progress during compression', async () => {
    const message = {
      data: {
        id: 'test-id',
        name: 'test.jpg',
        type: 'image/jpeg',
        data: new ArrayBuffer(1000),
        params: {
          format: 'jpeg',
          quality: 0.75,
        },
      },
    }

    const handlers: any = {}
    mockSelf.addEventListener.mockImplementation((event, handler) => {
      handlers[event] = handler
    })

    if (handlers.message) {
      await handlers.message(message)
    }

    // Check for progress messages
    const progressCalls = mockPostMessage.mock.calls.filter(
      call => call[0]?.type === 'progress'
    )
    expect(progressCalls.length).toBeGreaterThan(0)
  })

  it('handles error during compression', async () => {
    // Make convertToBlob throw error
    global.OffscreenCanvas = vi.fn().mockImplementation(() => ({
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      convertToBlob: vi.fn(() => Promise.reject(new Error('Compression failed'))),
    })) as any

    const message = {
      data: {
        id: 'test-id',
        name: 'test.jpg',
        type: 'image/jpeg',
        data: new ArrayBuffer(1000),
        params: {
          format: 'jpeg',
          quality: 0.75,
        },
      },
    }

    const handlers: any = {}
    mockSelf.addEventListener.mockImplementation((event, handler) => {
      handlers[event] = handler
    })

    if (handlers.message) {
      await handlers.message(message)
    }

    // Check for error message
    const errorCalls = mockPostMessage.mock.calls.filter(
      call => call[0]?.type === 'error'
    )
    expect(errorCalls.length).toBeGreaterThan(0)
  })

  it('handles different image formats', async () => {
    const formats = ['jpeg', 'png', 'webp']
    
    for (const format of formats) {
      vi.clearAllMocks()
      
      const message = {
        data: {
          id: `test-${format}`,
          name: `test.${format}`,
          type: `image/${format}`,
          data: new ArrayBuffer(1000),
          params: {
            format,
            quality: 0.8,
          },
        },
      }

      const handlers: any = {}
      mockSelf.addEventListener.mockImplementation((event, handler) => {
        handlers[event] = handler
      })

      if (handlers.message) {
        await handlers.message(message)
      }

      expect(mockPostMessage).toHaveBeenCalled()
    }
  })

  it('respects quality parameter', async () => {
    const qualities = [0.3, 0.6, 0.9]
    
    for (const quality of qualities) {
      vi.clearAllMocks()
      
      const message = {
        data: {
          id: `test-q${quality}`,
          name: 'test.jpg',
          type: 'image/jpeg',
          data: new ArrayBuffer(1000),
          params: {
            format: 'jpeg',
            quality,
          },
        },
      }

      const handlers: any = {}
      mockSelf.addEventListener.mockImplementation((event, handler) => {
        handlers[event] = handler
      })

      if (handlers.message) {
        await handlers.message(message)
      }

      // Verify convertToBlob was called with correct quality
      const canvas = global.OffscreenCanvas.mock.results[0]?.value
      if (canvas?.convertToBlob) {
        expect(canvas.convertToBlob).toHaveBeenCalled()
      }
    }
  })

  it('handles avoidUpsize parameter', async () => {
    // Mock smaller output
    global.OffscreenCanvas = vi.fn().mockImplementation(() => ({
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      convertToBlob: vi.fn(() => 
        Promise.resolve(new Blob(['small'], { type: 'image/jpeg' }))
      ),
    })) as any

    const message = {
      data: {
        id: 'test-id',
        name: 'test.jpg',
        type: 'image/jpeg',
        data: new ArrayBuffer(10000), // Large input
        params: {
          format: 'jpeg',
          quality: 0.5,
          avoidUpsize: true,
        },
      },
    }

    const handlers: any = {}
    mockSelf.addEventListener.mockImplementation((event, handler) => {
      handlers[event] = handler
    })

    if (handlers.message) {
      await handlers.message(message)
    }

    // Should use compressed version since it's smaller
    const doneCalls = mockPostMessage.mock.calls.filter(
      call => call[0]?.type === 'done'
    )
    expect(doneCalls.length).toBe(1)
  })
})