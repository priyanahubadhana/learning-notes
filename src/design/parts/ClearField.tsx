import {
  forwardRef,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react'
import { Icon } from '../../app/tools/icons'
import { clearInput } from './clearInput'
import { tp } from './tp'
import './ClearField.css'

type Common = {
  onClear?: () => void
  /** Textarea: the ✕ sits top right. */
  multiline?: boolean
  /** Screen-reader name of the ✕; default names the field ("Clear search"). */
  clearLabel?: string
}
export type ClearFieldProps = Common &
  (
    | (InputHTMLAttributes<HTMLInputElement> & { multiline?: false })
    | (TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true })
  )

type Loose = Common & Record<string, unknown> & { className?: string }

/**
 * A system text field with a ✕ that shows only while it has text (SP-04).
 * Clear empties it, keeps focus and says "Cleared". Esc clears first; a second
 * Esc leaves the field. `data-noclr` (note text, code) opts out.
 */
export const ClearField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  ClearFieldProps
>(function ClearField(props, ref) {
  const { onClear, multiline, clearLabel, className, ...rest } =
    props as unknown as Loose
  const own = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [said, setSaid] = useState('')
  const optOut = rest['data-noclr'] !== undefined
  const off = !!rest.disabled || !!rest.readOnly
  const name =
    (rest['aria-label'] as string | undefined) ??
    (rest.placeholder as string | undefined)
  const label =
    clearLabel ??
    (name ? tp('parts.clear.named', { name }) : tp('parts.clear.label'))

  const doClear = () => {
    const el = own.current
    if (!el) return
    clearInput(el, onClear)
    setSaid(tp('parts.clear.done'))
  }
  const setRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    own.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }
  const onKeyDown = (
    e: KeyboardEvent<HTMLInputElement & HTMLTextAreaElement>,
  ) => {
    ;(rest.onKeyDown as ((ev: unknown) => void) | undefined)?.(e)
    if (e.defaultPrevented || optOut || off) return
    if (e.key === 'Escape' && e.currentTarget.value) {
      e.preventDefault()
      e.stopPropagation()
      doClear()
    }
  }
  // :placeholder-shown needs a placeholder to exist.
  const placeholder = (rest.placeholder as string | undefined) ?? ' '
  const common = {
    ...rest,
    placeholder,
    className: `clr-field ${className ?? ''}`,
    onKeyDown,
    ref: setRef as Ref<never>,
  }
  const field = multiline ? (
    <textarea {...(common as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
  ) : (
    <input type="text" {...(common as InputHTMLAttributes<HTMLInputElement>)} />
  )
  if (optOut) return field
  return (
    <span className="clr-wrap" data-multiline={multiline || undefined}>
      {field}
      {!off && (
        <button
          type="button"
          className="clr-btn"
          aria-label={label}
          data-testid="clr-btn"
          // Keep focus in the field while pressing ✕.
          onPointerDown={(e) => e.preventDefault()}
          onClick={doClear}
        >
          <Icon name="close" size={14} />
        </button>
      )}
      <span className="clr-live" role="status" aria-live="polite">
        {said}
      </span>
    </span>
  )
})
