import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n/t'
import { reportError } from './errors'

interface Props {
  /** A new value (the user moved elsewhere) tries the screen again. */
  resetKey?: unknown
  /** Takes the user somewhere that works. */
  onHome: () => void
  /** Saves a backup file of everything. */
  onSaveAll: () => Promise<void>
  /** Fills the window: nothing else of the app is left to show. */
  fullScreen?: boolean
  children: ReactNode
}

interface State {
  failed: boolean
  resetKey?: unknown
}

/**
 * Catches a screen that fails to draw (a damaged record, a file that could
 * not be downloaded), so one failure never leaves a blank app. The way out
 * works without an address bar, as in the installed iPad app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.resetKey === state.resetKey) return null
    return { failed: false, resetKey: props.resetKey }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportError(error, `Screen failed${info.componentStack ?? ''}`)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <ErrorScreen
        onHome={this.props.onHome}
        onSaveAll={this.props.onSaveAll}
        fullScreen={this.props.fullScreen}
      />
    )
  }
}

function ErrorScreen({
  onHome,
  onSaveAll,
  fullScreen,
}: Pick<Props, 'onHome' | 'onSaveAll' | 'fullScreen'>) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const save = () => {
    setSaving(true)
    setMessage('')
    onSaveAll()
      .then(
        () => setMessage(t('error.saved')),
        (error: unknown) => {
          reportError(error, 'Could not save a backup file')
          setMessage(t('error.saveFailed'))
        },
      )
      .finally(() => setSaving(false))
  }
  const button = 'min-h-11 rounded-lg px-4 text-sm'
  return (
    <div
      role="alert"
      className={`mx-auto flex max-w-[30rem] flex-col justify-center bg-bg px-4 text-ink ${
        fullScreen ? 'min-h-screen' : 'mt-[20vh]'
      }`}
    >
      <h1 className="mb-2 text-lg font-semibold">{t('error.title')}</h1>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        {t('error.text')}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          autoFocus
          onClick={onHome}
          className={`${button} bg-accent font-medium text-white hover:opacity-90`}
        >
          {t('error.home')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={`${button} border border-line hover:bg-hover disabled:opacity-50`}
        >
          {t('error.saveAll')}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-muted">
          {message}
        </p>
      )}
    </div>
  )
}
