import type { TabDef } from '../../design/parts/TabRow'
import type { ProFeatureId } from '../../settings/proFeatures.gen'
import { t, type MessageKey } from '../../i18n/t'

/**
 * The draft model of the More sheet: edits are staged, nothing is saved until
 * Done. Done runs all of them and gives back ONE undo that reverts all.
 */
export interface DraftEdit {
  /** Same key = the later edit replaces the earlier one. */
  key: string
  apply: () => Promise<void> | void
  undo: () => Promise<void> | void
}

export function createDraft() {
  let edits = new Map<string, DraftEdit>()
  return {
    stage(edit: DraftEdit) {
      edits.set(edit.key, edit)
    },
    dirty: () => edits.size > 0,
    size: () => edits.size,
    discard() {
      edits = new Map()
    },
    /** Applies every edit in the order staged; null when there was nothing. */
    async commit(): Promise<(() => Promise<void>) | null> {
      const done = [...edits.values()]
      edits = new Map()
      if (!done.length) return null
      for (const e of done) await e.apply()
      return async () => {
        for (const e of [...done].reverse()) await e.undo()
      }
    },
  }
}

export type MoreTabId =
  'decks' | 'browse' | 'editor' | 'make' | 'stats' | 'scheduler' | 'anki'

const TABS: { id: MoreTabId; key: ProFeatureId; label: MessageKey }[] = [
  { id: 'decks', key: 'rev.decks', label: 'rv2.tab.decks' },
  { id: 'browse', key: 'rev.browse', label: 'rv2.tab.browse' },
  { id: 'editor', key: 'rev.editor', label: 'rv2.tab.editor' },
  { id: 'make', key: 'rev.makeCards', label: 'rv2.tab.make' },
  { id: 'stats', key: 'rev.stats', label: 'rv2.tab.stats' },
  { id: 'scheduler', key: 'rev.scheduler', label: 'rv2.tab.scheduler' },
  { id: 'anki', key: 'rev.anki', label: 'rv2.tab.anki' },
]

/** The tabs whose own switch is on, in a fixed order. */
export function moreTabs(unlocked: (id: ProFeatureId) => boolean): TabDef[] {
  return TABS.filter((x) => unlocked(x.key)).map((x) => ({
    id: x.id,
    label: t(x.label),
  }))
}
