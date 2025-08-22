import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'

describe('Sidebar', () => {
  it('renders links for image and video sections', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('画像')).toBeInTheDocument()
    expect(screen.getByText('動画')).toBeInTheDocument()
    expect(screen.getAllByText('圧縮').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('変換').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('リサイズ').length).toBeGreaterThanOrEqual(2)
  })
})

