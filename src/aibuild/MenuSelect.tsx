import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { MenuPopover } from '../app/ui'

const field =
  'inline-flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-bg px-3 text-left text-sm outline-none focus:border-accent'

/**
 * A pick-one choice shown as a ▾ button that opens the shared menu (the one
 * way the app offers a list of options). The chosen option is ticked.
 */
export function MenuSelect<V extends string | number>({
  value,
  options,
  label,
  testId,
  onChange,
  wide,
}: {
  value: V
  options: readonly { value: V; label: string }[]
  /** Accessible name of the button and the list. */
  label: string
  testId?: string
  onChange: (value: V) => void
  /** Fill the width of the row (a destination picker). */
  wide?: boolean
}) {
  const [at, setAt] = useState<DOMRect | null>(null)
  const current = options.find((o) => o.value === value) ?? options[0]
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!at}
        data-testid={testId}
        className={`${field} ${wide ? 'w-full' : ''}`}
        onClick={(e) => setAt(e.currentTarget.getBoundingClientRect())}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown size={16} strokeWidth={1.6} aria-hidden />
      </button>
      {at && (
        <MenuPopover
          anchor={at}
          label={label}
          topLayer
          onClose={() => setAt(null)}
          items={options.map((o) => ({
            label: o.label,
            icon: '',
            checked: o.value === value,
            onSelect: () => onChange(o.value),
          }))}
        />
      )}
    </>
  )
}
