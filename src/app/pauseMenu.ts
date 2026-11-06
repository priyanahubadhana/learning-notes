import { runTask } from './errors'
import type { MenuItem } from './ui'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { pauseItem, resumeItem } from '../recall/pauseService'

/**
 * The ⋯ menu entry that pauses (or resumes) the reviews of a notebook or a
 * page with its sub-pages (E1). Nothing is lost; the Paused list in Review
 * shows what is paused.
 */
export function pauseMenuItem(
  db: LearningNotesDB,
  kind: 'notebook' | 'page',
  id: string,
  title: string,
  paused: boolean,
  toast: (message: string) => void,
): MenuItem {
  return {
    label: t(paused ? 'pause.resume' : 'pause.pause'),
    icon: paused ? '▶' : '⏸',
    onSelect: () => {
      runTask(
        (paused ? resumeItem(db, kind, id) : pauseItem(db, kind, id)).then(
          () => {
            toast(t(paused ? 'pause.resumed' : 'pause.paused', { name: title }))
          },
        ),
      )
    },
  }
}
