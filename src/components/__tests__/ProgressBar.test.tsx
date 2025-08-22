import { render } from '@testing-library/react'
import ProgressBar from '../../components/ProgressBar'

describe('ProgressBar', () => {
  it('applies width style based on value', () => {
    const { container } = render(<ProgressBar value={50} />)
    const inner = container.querySelector('.progress-inner') as HTMLElement
    expect(inner).toBeInTheDocument()
    expect(inner.style.width).toBe('50%')
  })

  it('indeterminate mode has class', () => {
    const { container } = render(<ProgressBar indeterminate />)
    const inner = container.querySelector('.progress-inner') as HTMLElement
    expect(inner.classList.contains('indeterminate')).toBe(true)
  })
})

