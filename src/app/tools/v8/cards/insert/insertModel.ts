import { TAB_GROUPS, ribbonGroup, type ToolDef } from '../../../toolRegistry'
import { metaOf } from '../../../toolRegistryMeta'
import type { TabId } from '../../../tabs'

/**
 * What the Insert card and the All tools card list (toolbar.v8, slice 1f).
 * Both read the one registry and its ribbon groups, so no tool is copied and
 * none is dropped; Professional switches only add tools.
 */

export interface ToolGroup {
  id: string
  tab: TabId
  tools: ToolDef[]
}

export interface InsertUnlocks {
  /** Professional: `tb.insertMore`. */
  insertMore: boolean
}

/** Beginner tools show always; a Professional tool shows with its switch. */
const shown = (id: string, u: InsertUnlocks): boolean =>
  metaOf(id)?.level !== 'professional' || u.insertMore

/** The Insert tab's groups, in ribbon order, minus what is still locked. */
export function insertGroups(u: InsertUnlocks): ToolGroup[] {
  const seen = new Set<string>()
  return TAB_GROUPS.insert
    .map((group) => ({
      id: group,
      tab: 'insert' as TabId,
      tools: ribbonGroup('insert', group).filter((tool) => {
        if (seen.has(tool.id) || !shown(tool.id, u)) return false
        seen.add(tool.id)
        return true
      }),
    }))
    .filter((g) => g.tools.length > 0)
}

const TABS: readonly TabId[] = [
  'home',
  'insert',
  'draw',
  'view',
  'review',
  'file',
]

/** Every ribbon group of every tab (the old Ribbon), for the All tools card. */
export function allToolsGroups(): ToolGroup[] {
  return TABS.flatMap((tab) =>
    TAB_GROUPS[tab]
      .map((group) => ({ id: group, tab, tools: ribbonGroup(tab, group) }))
      .filter((g) => g.tools.length > 0),
  )
}
