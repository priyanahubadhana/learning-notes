import { useRef, useState } from 'react'
import { Icon } from '../../app/tools/icons'
import type { TreeState } from '../../app/useTreeState'
import { collapseAllState } from './collapseAll'
import { tn } from './tn'

/**
 * NB-B22: an icon button in the Notebooks group header beside "+" (gate 3:
 * words beside it cut the heading). Its name shows on hover and on a 0.5 s
 * hold. One tap folds every notebook; the same button then opens them all.
 */
export function CollapseAllButton({
  ids,
  tree,
}: {
  ids: readonly string[]
  tree: TreeState
}) {
  const { action, disabled } = collapseAllState(ids, tree.isNotebookOpen)
  const label = tn(
    action === 'collapse'
      ? 'nbv2.sidebar.collapseAll'
      : 'nbv2.sidebar.expandAll',
  )
  const [named, setNamed] = useState(false)
  const timer = useRef(0)
  const held = useRef(false)
  const end = () => {
    window.clearTimeout(timer.current)
    if (held.current)
      timer.current = window.setTimeout(() => setNamed(false), 1200)
  }
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        data-testid="nbv2-collapse-all"
        disabled={disabled}
        aria-label={label}
        title={label}
        onPointerDown={() => {
          held.current = false
          timer.current = window.setTimeout(() => {
            held.current = true
            setNamed(true)
          }, 500)
        }}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        onContextMenu={(e) => held.current && e.preventDefault()}
        onClick={() => {
          if (held.current) return
          if (action === 'collapse') tree.collapseAllNotebooks(ids)
          else tree.expandAllNotebooks()
        }}
        className="grid min-h-7 min-w-7 place-items-center rounded-md text-ink-soft hover:bg-hover disabled:opacity-40 any-pointer-coarse:min-h-11 any-pointer-coarse:min-w-11"
      >
        <Icon
          name={action === 'collapse' ? 'chevronUp' : 'chevronDown'}
          size={14}
        />
      </button>
      {named && (
        <span
          role="tooltip"
          className="pointer-events-none absolute end-0 top-full mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium normal-case tracking-normal text-bg"
        >
          {label}
        </span>
      )}
    </span>
  )
}
