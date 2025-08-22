import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ImageConvert from '../../image/Convert'

describe('ImageConvert page', () => {
  it('renders preset group and button', () => {
    render(
      <MemoryRouter initialEntries={["/image/convert"]}>
        <Routes>
          <Route path="/image/convert" element={<ImageConvert />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('画像 変換')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '品質プリセット' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '変換開始' })).toBeInTheDocument()
  })
})

