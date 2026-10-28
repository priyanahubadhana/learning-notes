import { useId, type ReactNode } from 'react'

/**
 * A labelled button that opens the file picker (instead of the browser's
 * plain "Choose File" box). `hint` is a short line under it.
 */
export function FileButton({
  label,
  hint,
  accept,
  disabled,
  className,
  onFile,
}: {
  label: ReactNode
  hint?: string
  accept?: string
  disabled?: boolean
  className?: string
  onFile: (file: File) => void
}) {
  const hintId = useId()
  return (
    <span className={`inline-flex flex-col gap-1 ${className ?? ''}`}>
      <label
        className={`inline-flex min-h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-line px-3 text-[13px] hover:bg-hover focus-within:outline-2 focus-within:outline-accent ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {label}
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onFile(file)
          }}
          className="sr-only"
        />
      </label>
      {hint && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
    </span>
  )
}
