import { useId, useState, type ReactNode } from 'react'
import { Icon } from '../../app/tools/icons'
import './FoldGroup.css'

/**
 * A group folded behind its heading with a ▾ (simple by default, the rest one
 * tap deeper). Closed unless `defaultOpen`; the heading is a 44 px button.
 */
export function FoldGroup({
  label,
  hint,
  icon,
  defaultOpen = false,
  testId,
  children,
}: {
  label: string
  /** A grey line under the label: what is inside. */
  hint?: string
  icon?: ReactNode
  defaultOpen?: boolean
  testId?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="fgroup" data-testid={testId}>
      <button
        type="button"
        className="fgroup-head"
        aria-expanded={open}
        aria-controls={id}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
      >
        {icon ? (
          <span className="fgroup-icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="fgroup-text">
          <span>{label}</span>
          {hint ? <span className="fgroup-hint">{hint}</span> : null}
        </span>
        <span className="fgroup-chev" aria-hidden>
          <Icon name="chevronDown" size={18} />
        </span>
      </button>
      {open && (
        <div className="fgroup-body" id={id}>
          {children}
        </div>
      )}
    </section>
  )
}
