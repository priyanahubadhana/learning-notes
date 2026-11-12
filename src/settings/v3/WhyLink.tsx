import { useState, type ReactNode } from 'react'
import { SheetBase } from '../../design/parts/SheetBase'
import { tv } from './tv'

/**
 * SET-B46: a "Why?" link (or a ? on a row) that opens a pop-up explaining
 * things in plain words. The shared sheet closes with ✕, Esc and a tap
 * outside. The explanation never replaces the row in place; it is the same
 * words in Beginner and Professional.
 */
export function WhyLink({
  title,
  children,
  label,
  mark = false,
  id,
}: {
  title: string
  children: ReactNode
  /** Screen-reader name when it is only a ?. */
  label?: string
  /** Draw a round ? instead of the word "Why?". */
  mark?: boolean
  id?: string
}) {
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        ref={setOpener}
        type="button"
        data-why={id}
        className={mark ? 'sv3-why sv3-why-mark' : 'sv3-why sv3-link'}
        aria-haspopup="dialog"
        aria-label={
          label ?? (mark ? tv('sv3.why.label', { title }) : undefined)
        }
        onClick={() => setOpen(true)}
      >
        {mark ? '?' : tv('sv3.why')}
      </button>
      {open && (
        <SheetBase
          title={title}
          anchor={opener}
          onClose={() => setOpen(false)}
          data-testid="sv3-why-popup"
        >
          <div className="sv3-why-text">{children}</div>
        </SheetBase>
      )}
    </>
  )
}
