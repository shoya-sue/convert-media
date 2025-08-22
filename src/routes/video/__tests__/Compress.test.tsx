import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import VideoCompress from '../../video/Compress'

describe('VideoCompress page', () => {
  it('renders video quality presets UI', () => {
    render(
      <MemoryRouter initialEntries={["/video/compress"]}>
        <Routes>
          <Route path="/video/compress" element={<VideoCompress />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('動画 圧縮')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '品質プリセット' })).toBeInTheDocument()
  })
})

