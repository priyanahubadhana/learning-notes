import type { MenuItem } from '../../app/ui'
import type { Page } from '../../core/types'
import { t } from '../../i18n/t'
import type { LibraryPrefs, ManualStatus } from './libraryPrefs'
import { statusOf } from './shelves'

export interface BookActions {
  open: (page: Page) => void
  start: (page: Page) => void
  setStatus: (page: Page, status: ManualStatus) => void
  collections: (page: Page) => void
  tags: (page: Page, anchor: HTMLElement | null) => void
  original: (page: Page) => void
  exportHighlights: (page: Page) => void
  remove: (page: Page) => void
}

/** The label of the main button under a book. */
export function startLabel(page: Page, prefs: LibraryPrefs): string {
  const source = page.source
  if (source?.kind !== 'book') return t('library.open')
  const status = statusOf(page, prefs.manual)
  const fresh = !source.openedAt && !(source.progress ?? 0)
  if (status === 'finished') return t('library.readAgain')
  return fresh ? t('library.startReading') : t('library.continue')
}

/** The ⋯ and press-and-hold menu of a book: Continue first. */
export function bookMenuItems(
  page: Page,
  prefs: LibraryPrefs,
  a: BookActions,
  anchor: HTMLElement | null,
): MenuItem[] {
  const status = statusOf(page, prefs.manual)
  const mark = (
    s: ManualStatus,
    key: 'lib2.mark.want' | 'lib2.mark.reading' | 'lib2.mark.finished',
  ): MenuItem => ({
    label: t(key),
    icon: 'check',
    checked: status === s,
    onSelect: () => a.setStatus(page, s),
  })
  const url = page.source?.url
  return [
    {
      label: startLabel(page, prefs),
      icon: 'bookOpen',
      onSelect: () => a.start(page),
    },
    {
      label: t('library.openNotes'),
      icon: 'fileText',
      onSelect: () => a.open(page),
    },
    {
      label: t('lib2.markAs'),
      icon: 'list',
      onSelect: () => undefined,
      submenu: [
        mark('want', 'lib2.mark.want'),
        mark('reading', 'lib2.mark.reading'),
        mark('finished', 'lib2.mark.finished'),
      ],
    },
    {
      label: t('lib2.addToCollections'),
      icon: 'notebook',
      onSelect: () => a.collections(page),
    },
    {
      label: t('lib2.tags'),
      icon: 'pin',
      onSelect: () => a.tags(page, anchor),
    },
    ...(url && url.startsWith('https://')
      ? [
          {
            label: t('lib2.openOriginal'),
            icon: 'link',
            onSelect: () => a.original(page),
          },
        ]
      : []),
    {
      label: t('lib2.exportHighlights'),
      icon: 'fileDown',
      onSelect: () => a.exportHighlights(page),
    },
    {
      label: t('ui.delete'),
      icon: 'trash',
      onSelect: () => a.remove(page),
      danger: true,
    },
  ]
}
