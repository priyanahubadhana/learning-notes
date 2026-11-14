import { useId, useState, type ReactNode } from 'react'
import { Icon } from '../../app/tools/icons'
import './FoldGroup.css'

/**
 * A group folded behind its heading with a ▾ (simple by default, the rest one
 * tap deeper). Closed unless `defaultOpen`; the heading is a 44 px button.
 */
export function FoldGroup({
  label,
  defaultOpen = false,
  testId,
  children,
}: {
  label: string
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
        <span>{label}</span>
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
