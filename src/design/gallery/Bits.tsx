import type { ReactNode } from 'react'

/** One gallery section: `data-testid="gal-<id>"`, a heading and its demos. */
export function Section({
  id,
  title,
  help,
  children,
}: {
  id: string
  title: string
  help?: string
  children: ReactNode
}) {
  return (
    <section data-testid={`gal-${id}`} className="mt-10">
      <h2 className="t-h2 mb-2">{title}</h2>
      {help && <p className="t-small text-muted mb-4">{help}</p>}
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

/** One state cell: `data-state="<state>"` so a screenshot test can target it. */
export function Demo({
  state,
  label,
  children,
  className = '',
}: {
  state: string
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <figure
      data-state={state}
      data-testid={`demo-${state}`}
      className={`m-0 ${className}`.trim()}
    >
      <figcaption className="t-small text-muted mb-2">{label}</figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  )
}

/** Cells that sit side by side and wrap; on a phone they stack, one per row. */
export function Cells({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-6 sm:flex-row sm:flex-wrap">
      {children}
    </div>
  )
}
