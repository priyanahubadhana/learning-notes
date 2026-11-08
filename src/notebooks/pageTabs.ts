import type { LearningNotesDB } from '../core/db'
import { getLive } from '../core/records'
import type { Notebook } from '../core/types'
import { readPref } from '../app/uiPrefs'
import type { MessageKey } from '../i18n/t'

/**
 * Optional page tabs. Every page has Notes, Summary and Review. A notebook can
 * switch on more (off by default so pages stay clean): Mind map, Slides,
 * Audio & video, Database. The choice is kept on the notebook (`pageTabs`);
 * a device default (pref `pageTabs.default`) applies to new notebooks.
 */
export const EXTRA_TABS = ['mindMap', 'slides', 'audio', 'database'] as const
export type ExtraTab = (typeof EXTRA_TABS)[number]

export const EXTRA_TAB_LABEL: Record<ExtraTab, MessageKey> = {
  mindMap: 'tabs.mindMap',
  slides: 'tabs.slides',
  audio: 'tabs.audio',
  database: 'tabs.database',
}

export const isExtraTab = (v: unknown): v is ExtraTab =>
  typeof v === 'string' && (EXTRA_TABS as readonly string[]).includes(v)

/** Known tabs only, once each, always in the fixed order. */
export function cleanTabs(list: readonly unknown[] | undefined): ExtraTab[] {
  const set = new Set((list ?? []).filter(isExtraTab))
  return EXTRA_TABS.filter((t) => set.has(t))
}

/** The extra tabs a notebook shows on its pages. */
export const notebookPageTabs = (
  notebook: Pick<Notebook, 'pageTabs'> | undefined,
): ExtraTab[] => cleanTabs(notebook?.pageTabs)

export const DEFAULT_TABS_PREF = 'pageTabs.default'
const isList = (v: unknown): v is unknown[] => Array.isArray(v)

/** The tabs a new notebook starts with (this device's default; none at first). */
export const defaultPageTabs = (): ExtraTab[] =>
  cleanTabs(readPref(DEFAULT_TABS_PREF, isList, []))

/** Turns one extra tab on or off for a notebook. */
export async function setNotebookPageTab(
  db: LearningNotesDB,
  notebookId: string,
  tab: ExtraTab,
  on: boolean,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    const nb = await getLive(db.notebooks, notebookId)
    const set = new Set(notebookPageTabs(nb))
    if (on) set.add(tab)
    else set.delete(tab)
    const next = EXTRA_TABS.filter((t) => set.has(t))
    await db.notebooks.update(notebookId, {
      pageTabs: next.length ? next : undefined,
      updatedAt: Date.now(),
    })
  })
}
