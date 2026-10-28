import { useId, useState, type Ref } from 'react'
import { t } from '../i18n/t'

/**
 * A password box with a show/hide eye. With `error` it gets a red border and
 * a bold red message with a warning icon under it.
 */
export function PasswordInput({
  value,
  onChange,
  label,
  placeholder,
  autoComplete = 'off',
  error,
  inputRef,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  autoComplete?: string
  error?: string
  inputRef?: Ref<HTMLInputElement>
  className?: string
}) {
  const [shown, setShown] = useState(false)
  const errorId = useId()
  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-label={label}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`min-h-9 w-full min-w-0 rounded-lg border bg-bg ps-2 pe-11 text-[13px] ${
            error ? 'border-danger' : 'border-line'
          }`}
        />
        <button
          type="button"
          aria-label={shown ? t('password.hide') : t('password.show')}
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-e-lg text-muted hover:text-ink phone:w-11"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {shown && <path d="M4 20 20 4" />}
          </svg>
        </button>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-danger"
        >
          <span aria-hidden>⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}
