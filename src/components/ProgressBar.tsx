type Props = { value?: number; indeterminate?: boolean }

export default function ProgressBar({ value = 0, indeterminate }: Props) {
  return (
    <div className="progress">
      <div
        className={`progress-inner ${indeterminate ? 'indeterminate' : ''}`}
        style={!indeterminate ? { width: `${Math.min(100, Math.max(0, value))}%` } : undefined}
      />
    </div>
  )
}

