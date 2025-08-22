import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ImageCompress from '../../image/Compress'

describe('ImageCompress page', () => {
  it('renders dropzone and form controls', () => {
    render(
      <MemoryRouter initialEntries={["/image/compress"]}>
        <Routes>
          <Route path="/image/compress" element={<ImageCompress />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('画像 圧縮')).toBeInTheDocument()
    expect(screen.getByText('出力形式')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '処理開始' })).toBeInTheDocument()
  })
})

