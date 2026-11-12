import { Icon } from '../../app/tools/icons'
import type { TreeState } from '../../app/useTreeState'
import { collapseAllState } from './collapseAll'
import { tn } from './tn'

/**
 * NB-B22: icon + words, Notion-like, in the Notebooks group header beside "+".
 * One tap folds every notebook; the same button then opens them all.
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
  return (
    <button
      type="button"
      data-testid="nbv2-collapse-all"
      disabled={disabled}
      onClick={() =>
        action === 'collapse'
          ? tree.collapseAllNotebooks(ids)
          : tree.expandAllNotebooks()
      }
      className="inline-flex min-h-7 items-center gap-1 rounded-full border border-line px-2 text-[11px] font-semibold normal-case tracking-normal text-ink-soft hover:bg-hover disabled:opacity-40 any-pointer-coarse:min-h-11 any-pointer-coarse:px-3"
    >
      <Icon
        name={action === 'collapse' ? 'chevronUp' : 'chevronDown'}
        size={12}
      />
      {label}
    </button>
  )
}
