import { useState } from 'react'
import { t } from '../i18n/t'
import { AreaInput } from '../settings/AreaInput'

const field =
  'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'

/**
 * Shows a recovery code BIG, with Print, Copy and Save as file (.txt), and
 * asks for its last four letters before moving on. Used by the sign-in guide
 * and by Settings › Sync (first key and "Make a new recovery code"). The code
 * is only ever on this screen and in what the person prints, copies or saves:
 * never logged, never stored by the app.
 */
export function RecoveryCodeView({
  code,
  onDone,
  big,
}: {
  code: string
  onDone: () => void
  /** Larger type for the full-screen sheet. */
  big?: boolean
}) {
  const [check, setCheck] = useState('')
  const [wrong, setWrong] = useState(false)
  const [copied, setCopied] = useState(false)
  const last = code.replace(/-/g, '').slice(-4)

  const copy = () => {
    void navigator.clipboard
      ?.writeText(code)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }
  const save = () => {
    const blob = new Blob([t('sync.codeFile', { code })], {
      type: 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'learning-notes-recovery-code.txt'
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-3">
      <style>
        {
          '@media print { body * { visibility: hidden } [data-print-code], [data-print-code] * { visibility: visible } [data-print-code] { position: fixed; inset: 0; padding: 2rem } }'
        }
      </style>
      <div
        data-print-code
        className="rounded-xl border border-line p-4"
        data-testid="recovery-code"
      >
        <h3 className="text-sm font-semibold">{t('sync.codeTitle')}</h3>
        <p
          className={`my-4 text-center font-mono font-semibold tracking-wider break-words select-all ${
            big ? 'text-3xl sm:text-4xl' : 'text-xl'
          }`}
        >
          {code}
        </p>
        <p className="text-sm text-muted">{t('sync.codeHelp')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => window.print()}>
          {t('sync.print')}
        </button>
        <button type="button" className={button} onClick={copy}>
          {copied ? t('sync.copied') : t('sync.copy')}
        </button>
        <button type="button" className={button} onClick={save}>
          {t('sync.saveFile')}
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t('sync.codeCheck')}
        <AreaInput
          className={field}
          value={check}
          autoComplete="off"
          onChange={(e) => {
            setCheck(e.target.value)
            setWrong(false)
          }}
        />
      </label>
      {wrong && <p className="text-sm text-danger">{t('sync.codeWrong')}</p>}
      <div>
        <button
          type="button"
          className={primary}
          onClick={() =>
            check.trim().toUpperCase() === last ? onDone() : setWrong(true)
          }
        >
          {t('sync.codeDone')}
        </button>
      </div>
    </div>
  )
}
