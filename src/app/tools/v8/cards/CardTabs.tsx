import type { KeyboardEvent } from 'react'

export interface CardTab {
  id: string
  label: string
  testId?: string
}

/**
 * The card's tab row (v9): one segmented control, full width inside the card,
 * 44 pt tall, the chosen tab raised. Left and Right move between the tabs.
 */
export function CardTabs({
  tabs,
  value,
  onPick,
  label,
}: {
  tabs: readonly CardTab[]
  value: string
  onPick: (id: string) => void
  label: string
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((x) => x.id === value)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(i + step + tabs.length) % tabs.length]
    onPick(next.id)
    e.currentTarget
      .querySelector<HTMLElement>(`[data-tab="${next.id}"]`)
      ?.focus()
  }
  return (
    <div className="v8tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((x) => (
        <button
          key={x.id}
          type="button"
          role="tab"
          data-tab={x.id}
          data-testid={x.testId}
          aria-selected={value === x.id}
          tabIndex={value === x.id ? 0 : -1}
          className={value === x.id ? 'v8tab v8tab-sel' : 'v8tab'}
          onClick={() => onPick(x.id)}
        >
          {x.label}
        </button>
      ))}
    </div>
  )
}
