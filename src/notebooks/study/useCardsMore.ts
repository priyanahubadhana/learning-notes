import { createElement, lazy, Suspense, useState, type ReactNode } from 'react'
import type { MenuItem } from '../../app/ui'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { useUnlocked } from '../../settings/level'

const CardsMoreParts = lazy(() => import('./CardsMoreParts'))

/**
 * The Cards tab "⋯" menu (slice 15): Memory helpers (ST26) and Anki import /
 * export (ST29), each only when its unlock is on. Returns the items and the
 * parts they open (loaded when first used).
 */
export function useCardsMore(
  db: LearningNotesDB,
  notebookId: string | null,
): { items: MenuItem[] | undefined; node: ReactNode } {
  const memory = useUnlocked('study.memoryHelpers')
  const anki = useUnlocked('study.anki')
  const [helpers, setHelpers] = useState(false)
  const [pick, setPick] = useState(0)
  const [exportTick, setExportTick] = useState(0)
  const items: MenuItem[] = [
    ...(memory
      ? [
          {
            label: t('st26.helpers'),
            icon: '',
            onSelect: () => setHelpers(true),
          },
        ]
      : []),
    ...(anki
      ? [
          {
            label: t('data.anki.import'),
            icon: '',
            onSelect: () => setPick((n) => n + 1),
          },
          {
            label: t('data.anki.export'),
            icon: '',
            onSelect: () => setExportTick((n) => n + 1),
          },
        ]
      : []),
  ]
  const used = helpers || pick > 0 || exportTick > 0
  return {
    items: items.length > 0 ? items : undefined,
    node:
      used &&
      createElement(
        Suspense,
        { fallback: null },
        createElement(CardsMoreParts, {
          db,
          notebookId,
          anki,
          pick,
          exportTick,
          helpers,
          onCloseHelpers: () => setHelpers(false),
        }),
      ),
  }
}
