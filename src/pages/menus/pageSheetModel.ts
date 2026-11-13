import type { IconName } from '../../app/tools/icons'
import { t, type MessageKey } from '../../i18n/t'

export type SheetSection = 'page' | 'view' | 'share' | 'protect' | 'tools'

/** One choice inside a row marked ▾ (a paper style, a theme, a copy format). */
export interface SubItem {
  label: string
  checked?: boolean
  run: () => void
}

export interface SheetRow {
  id: string
  section: SheetSection
  label: string
  icon: IconName
  danger?: boolean
  /** ▾ rows open their choices under them. */
  children?: SubItem[]
  /** A row that opens a second view of the sheet (Move). */
  view?: 'move'
  run?: () => void
}

/** What the page offers; the caller leaves out what does not apply (templates, no sign-in). */
export interface PageSheetActions {
  rename(): void
  duplicate(): void
  favourite: { on: boolean; run(): void }
  saveTemplate?: () => void
  importInto(): void
  remove(): void
  restore(): void
  reading(): void
  paperStyle?: SubItem[]
  paperSize?: SubItem[]
  deviceMode: SubItem[]
  toolbar: { shown: boolean; run(): void }
  theme: SubItem[]
  exportPage(): void
  copy: SubItem[]
  pastePlain(): void
  lock?: { label: string; run(): void }
  history(): void
  review?: () => void
  prompts?: () => void
  search(): void
  /** Existing page items kept as they are (edit lock, pause, page address). */
  extras?: {
    section: SheetSection
    label: string
    run?: () => void
    children?: SubItem[]
  }[]
}

/** Beginner's 8 rows, in this order (PM-61). */
export const BEGINNER_IDS = [
  'rename',
  'move',
  'duplicate',
  'export',
  'history',
  'lock',
  'delete',
  'reading',
] as const

export const SECTIONS: readonly SheetSection[] = [
  'page',
  'view',
  'share',
  'protect',
  'tools',
]

/** Most actions the pinned row holds (PM-63). */
export const PIN_MAX = 5

const tx = (key: string) => t(key as MessageKey)

/** Every row of the Professional sheet, by section (PM-62). */
export function buildRows(a: PageSheetActions): SheetRow[] {
  const rows: (SheetRow | null)[] = [
    {
      id: 'rename',
      section: 'page',
      label: tx('pageMenus.sheet.rename'),
      icon: 'penLine',
      run: a.rename,
    },
    {
      id: 'move',
      section: 'page',
      label: tx('pageMenus.sheet.move'),
      icon: 'move',
      view: 'move',
    },
    {
      id: 'duplicate',
      section: 'page',
      label: tx('pageMenus.sheet.duplicate'),
      icon: 'duplicate',
      run: a.duplicate,
    },
    {
      id: 'favourite',
      section: 'page',
      label: t(a.favourite.on ? 'fav.remove' : 'fav.add'),
      icon: 'star',
      run: a.favourite.run,
    },
    a.saveTemplate
      ? {
          id: 'saveTemplate',
          section: 'page',
          label: t('page.saveTemplate'),
          icon: 'template',
          run: a.saveTemplate,
        }
      : null,
    {
      id: 'import',
      section: 'page',
      label: t('page.import'),
      icon: 'import',
      run: a.importInto,
    },
    {
      id: 'delete',
      section: 'page',
      label: t('tree.deletePage'),
      icon: 'trash',
      danger: true,
      run: a.remove,
    },
    {
      id: 'restore',
      section: 'page',
      label: t('page.restoreBackup'),
      icon: 'history',
      run: a.restore,
    },
    {
      id: 'reading',
      section: 'view',
      label: tx('pageMenus.sheet.reading'),
      icon: 'bookOpen',
      run: a.reading,
    },
    a.paperStyle
      ? {
          id: 'paperStyle',
          section: 'view',
          label: t('paper.style'),
          icon: 'grid',
          children: a.paperStyle,
        }
      : null,
    a.paperSize
      ? {
          id: 'paperSize',
          section: 'view',
          label: t('paper.size'),
          icon: 'maximize',
          children: a.paperSize,
        }
      : null,
    {
      id: 'deviceMode',
      section: 'view',
      label: t('mode.menu'),
      icon: 'tablet',
      children: a.deviceMode,
    },
    {
      id: 'toolbar',
      section: 'view',
      label: t(a.toolbar.shown ? 'bar.hide' : 'bar.show'),
      icon: 'panel',
      run: a.toolbar.run,
    },
    {
      id: 'theme',
      section: 'view',
      label: t('settings.theme.label'),
      icon: 'theme',
      children: a.theme,
    },
    {
      id: 'export',
      section: 'share',
      label: t('page.export'),
      icon: 'share',
      run: a.exportPage,
    },
    {
      id: 'copy',
      section: 'share',
      label: t('copy.menu'),
      icon: 'copy',
      children: a.copy,
    },
    {
      id: 'pastePlain',
      section: 'share',
      label: t('paste.plain'),
      icon: 'paste',
      run: a.pastePlain,
    },
    a.lock
      ? {
          id: 'lock',
          section: 'protect',
          label: a.lock.label,
          icon: 'lock',
          run: a.lock.run,
        }
      : null,
    {
      id: 'history',
      section: 'protect',
      label: t('history.button'),
      icon: 'history',
      run: a.history,
    },
    a.review
      ? {
          id: 'review',
          section: 'tools',
          label: t('page.reviewThis'),
          icon: 'cards',
          run: a.review,
        }
      : null,
    a.prompts
      ? {
          id: 'prompts',
          section: 'tools',
          label: t('prompts.menu'),
          icon: 'sparkles',
          run: a.prompts,
        }
      : null,
    {
      id: 'search',
      section: 'tools',
      label: t('panel.open'),
      icon: 'search',
      run: a.search,
    },
  ]
  const out = rows.filter((r): r is SheetRow => r !== null)
  for (const [i, x] of (a.extras ?? []).entries()) {
    out.push({
      id: `extra${i}`,
      section: x.section,
      label: x.label,
      icon: 'sliders',
      run: x.run,
      children: x.children,
    })
  }
  return out
}

/** Beginner: the 8 plain rows. Professional (page.menuAll): sections in order. */
export function visibleGroups(
  rows: readonly SheetRow[],
  all: boolean,
): { section: SheetSection | null; rows: SheetRow[] }[] {
  if (!all) {
    const rows8 = BEGINNER_IDS.flatMap((id) => rows.filter((r) => r.id === id))
    return [{ section: null, rows: rows8 }]
  }
  return SECTIONS.map((section) => ({
    section,
    rows: rows.filter((r) => r.section === section),
  })).filter((g) => g.rows.length > 0)
}

/** Keeps known, distinct ids, at most PIN_MAX. */
export function cleanPins(value: unknown, known: readonly string[]): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const v of value)
    if (typeof v === 'string' && known.includes(v) && !out.includes(v))
      out.push(v)
  return out.slice(0, PIN_MAX)
}
