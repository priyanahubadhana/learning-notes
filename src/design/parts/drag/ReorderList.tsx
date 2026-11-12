/* eslint-disable react-hooks/refs -- useReorder keeps drag state in refs on purpose (updated by pointer events, not render); the props it returns only read them inside event handlers. */
import type { CSSProperties, ReactNode } from 'react'
import { DropLine } from './DropLine'
import { Grip } from './Grip'
import { MoveButtons } from './MoveButtons'
import { useReorder, type ReorderProps } from './useReorder'
import './drag.css'

export interface RowContext {
  index: number
  count: number
  state: string
  /** The grip, or null when the list drags by the whole row only. */
  grip: ReactNode
  /** ▲▼, or null when switched off or only one item. */
  moveButtons: ReactNode
}

/** A list or grid that reorders by grip, long-hold, ▲▼ and Alt+arrows (SP-06). */
export function ReorderList<T>(
  props: ReorderProps<T> & {
    renderItem(item: T, ctx: RowContext): ReactNode
    className?: string
    'aria-label'?: string
    testId?: string
    /** Gallery: freeze one visual state on every item. */
    itemClass?: (item: T) => string | undefined
  },
) {
  const { renderItem, className, testId, itemClass, axis, cols, span } = props
  const r = useReorder(props)
  const count = r.ordered.length
  return (
    <>
      <ul
        ref={r.setContainer}
        role="list"
        aria-label={props['aria-label']}
        className={`rord ${className ?? ''}`}
        data-axis={axis}
        data-dragging={r.drag?.phase === 'lifted' ? '' : undefined}
        data-testid={testId}
        style={cols ? ({ '--rord-cols': cols } as CSSProperties) : undefined}
        {...r.containerProps}
      >
        {r.ordered.map((item, index) => {
          const id = props.getId(item)
          const ip = r.itemProps(id)
          const name = props.label(item)
          return (
            <li
              key={id}
              className={`rord-item ${itemClass?.(item) ?? ''}`}
              style={
                axis === 'grid' && span
                  ? { gridColumn: `span ${span(item)}` }
                  : undefined
              }
              {...ip}
            >
              {renderItem(item, {
                index,
                count,
                state: ip['data-state'],
                grip: r.hasGrip ? <Grip {...r.gripProps(id)} /> : null,
                moveButtons:
                  props.showMoveButtons && count > 1 ? (
                    <MoveButtons
                      name={name}
                      index={index}
                      count={count}
                      disabled={props.disabled}
                      onMove={(k) => r.moveBy(id, k, 'button')}
                    />
                  ) : null,
              })}
            </li>
          )
        })}
        <DropLine rect={r.line} />
      </ul>
      <div className="rord-live" role="status" aria-live="polite">
        {r.announcement}
      </div>
    </>
  )
}
