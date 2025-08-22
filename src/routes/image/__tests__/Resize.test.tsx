import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ImageResize from '../../image/Resize'

describe('ImageResize page', () => {
  it('renders size presets and button', () => {
    render(
      <MemoryRouter initialEntries={["/image/resize"]}>
        <Routes>
          <Route path="/image/resize" element={<ImageResize />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('画像 リサイズ')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'サイズプリセット' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'リサイズ開始' })).toBeInTheDocument()
  })
})

