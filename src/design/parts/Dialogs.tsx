import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../app/tools/icons'
import { openInTopLayer, trapFocus } from '../../app/overlay'
import { ClearField } from './ClearField'
import { tf } from './textFeedback'
import './Dialogs.css'

export const NAME_MAX = 40
export const NAME_COUNT_FROM = 32

interface BaseProps {
  title: string
  children?: ReactNode
  /** Esc, ✕ and the Cancel button. */
  onCancel(): void
  /** Enter and the main button. */
  onMain(): void
  mainLabel: string
  /** Alert has no Cancel button. */
  cancelLabel?: string | null
  danger?: boolean
  mainDisabled?: boolean
  role?: 'dialog' | 'alertdialog'
  mode?: 'floating' | 'inline'
  opener?: HTMLElement | null
  /** Focus this first (a field); default is the main button. */
  autoFocus?: 'field' | 'main'
  id?: string
  'data-testid'?: string
}

/**
 * The shared dialog frame: centred card, ✕, Esc = cancel, Enter = main,
 * focus kept inside and returned to the opener. Red only for danger.
 */
export function Dialog(props: BaseProps) {
  const {
    mode = 'floating',
    title,
    children,
    onCancel,
    onMain,
    mainLabel,
    cancelLabel = tf('parts.fb.cancel'),
    danger,
    mainDisabled,
    role = 'dialog',
  } = props
  const autoId = useId()
  const id = props.id ?? `fbdlg-${autoId}`
  const layerRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef(onCancel)
  useLayoutEffect(() => {
    cancelRef.current = onCancel
  })

  useEffect(() => {
    if (mode !== 'floating') return
    const layer = layerRef.current
    const card = cardRef.current
    if (!layer || !card) return
    const opener =
      props.opener ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    let live = true
    const handle = openInTopLayer(layer, {
      id,
      layer: 'dialog',
      onClose: () => {
        if (live) cancelRef.current()
      },
      // The dim backdrop belongs to the dialog: a tap on it never closes it.
      opener,
    })
    const release = trapFocus(card, opener)
    const first =
      props.autoFocus === 'field'
        ? card.querySelector<HTMLElement>('input')
        : card.querySelector<HTMLElement>('[data-main]')
    ;(first ?? card).focus()
    return () => {
      live = false
      release()
      handle.close()
    }
  }, [mode, id, props.opener, props.autoFocus])

  const onKey = (e: RKeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.shiftKey) return
    const el = e.target as HTMLElement
    // Buttons and links keep their own Enter.
    if (el.closest('button, a, textarea')) return
    if (mainDisabled) return
    e.preventDefault()
    onMain()
  }

  const sfx = mode === 'inline' ? '-inline' : ''
  const card = (
    <div
      ref={cardRef}
      className="fb-dialog"
      role={role}
      aria-modal={mode === 'floating' ? 'true' : undefined}
      aria-labelledby={`${id}-title`}
      data-testid={props['data-testid'] ?? `fb-dialog${sfx}`}
      data-danger={danger ? '' : undefined}
      tabIndex={-1}
      onKeyDown={onKey}
    >
      <header className="fb-dialog__head">
        <h2 id={`${id}-title`} className="fb-dialog__title">
          {title}
        </h2>
        <button
          type="button"
          className="fb-x"
          aria-label={tf('parts.fb.close')}
          data-testid={`fb-dialog-close${sfx}`}
          onClick={onCancel}
        >
          <Icon name="close" size={16} />
        </button>
      </header>
      {children ? <div className="fb-dialog__body">{children}</div> : null}
      <footer className="fb-dialog__foot">
        {cancelLabel ? (
          <button
            type="button"
            className="fb-btn"
            data-testid={`fb-dialog-cancel${sfx}`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="fb-btn"
          data-variant={danger ? 'danger' : 'main'}
          data-main=""
          data-testid={`fb-dialog-main${sfx}`}
          disabled={mainDisabled}
          onClick={onMain}
        >
          {mainLabel}
        </button>
      </footer>
    </div>
  )

  if (mode === 'inline') return <div className="fb-dialog-inline">{card}</div>
  return createPortal(
    <div
      ref={layerRef}
      className="fb-dialog-layer"
      data-testid="fb-dialog-layer"
    >
      {card}
    </div>,
    document.body,
  )
}

type Shared = Pick<BaseProps, 'mode' | 'opener' | 'id' | 'data-testid'>

/** Ask before something that cannot be undone (red only for danger). */
export function ConfirmDialog(
  props: Shared & {
    title: string
    text?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    onConfirm(): void
    onCancel(): void
  },
) {
  return (
    <Dialog
      {...props}
      role="alertdialog"
      mainLabel={props.confirmLabel ?? tf('parts.fb.confirm')}
      cancelLabel={props.cancelLabel}
      onMain={props.onConfirm}
    >
      {props.text ? <p className="fb-dialog__text">{props.text}</p> : null}
    </Dialog>
  )
}

/** Tell the person something; one OK button. Esc and ✕ do the same as OK. */
export function AlertDialog(
  props: Shared & {
    title: string
    text?: string
    okLabel?: string
    onClose(): void
  },
) {
  return (
    <Dialog
      {...props}
      role="alertdialog"
      cancelLabel={null}
      mainLabel={props.okLabel ?? tf('parts.fb.ok')}
      onMain={props.onClose}
      onCancel={props.onClose}
    >
      {props.text ? <p className="fb-dialog__text">{props.text}</p> : null}
    </Dialog>
  )
}

/** Ask for a name: ✕ clears, 40 characters at most, the count shows from 32. */
export function PromptDialog(
  props: Shared & {
    title: string
    label: string
    initial?: string
    saveLabel?: string
    onSubmit(value: string): void
    onCancel(): void
  },
) {
  const [value, setValue] = useState(props.initial ?? '')
  const fieldId = useId()
  const trimmed = value.trim()
  const showCount = value.length >= NAME_COUNT_FROM
  const submit = () => {
    if (trimmed) props.onSubmit(trimmed)
  }
  return (
    <Dialog
      {...props}
      autoFocus="field"
      mainLabel={props.saveLabel ?? tf('parts.fb.save')}
      mainDisabled={!trimmed}
      onMain={submit}
    >
      <label className="fb-dialog__label" htmlFor={fieldId}>
        {props.label}
      </label>
      <ClearField
        id={fieldId}
        value={value}
        maxLength={NAME_MAX}
        clearLabel={tf('parts.fb.clearName')}
        data-testid={`fb-prompt-input${props.mode === 'inline' ? '-inline' : ''}`}
        onChange={(e) => setValue(e.target.value)}
        onClear={() => setValue('')}
      />
      <p
        className="fb-dialog__count"
        data-testid={`fb-prompt-count${props.mode === 'inline' ? '-inline' : ''}`}
        data-over={value.length >= NAME_MAX ? '' : undefined}
        hidden={!showCount}
      >
        {showCount
          ? tf('parts.fb.count', { count: value.length, max: NAME_MAX })
          : ''}
      </p>
    </Dialog>
  )
}
