import type { ToastAction } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { toggleFavourite } from '../../app/favourites'
import { getAppActions } from '../../app/tools/toolRuntime'
import { theme as themeSetting } from '../../settings/builtinSettings'
import { THEMES } from '../../app/theme'
import type { MenuItem } from '../../app/ui'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { useDeviceSetting } from '../../settings/useSetting'
import { trashPageWithUndo } from '../pageTrash'
import type { PageSheetActions, SheetSection, SubItem } from './pageSheetModel'
import { duplicateThisPage } from './pageSheetService'

const subs = (item?: MenuItem): SubItem[] | undefined =>
  item?.submenu?.map((s) => ({
    label: s.label,
    checked: s.checked,
    run: s.onSelect,
  }))

export interface PageSheetInput {
  db: LearningNotesDB
  page: Page
  toast: (message: string, action?: ToastAction) => void
  starred: boolean
  /** The existing page ⋯ items, reused so nothing changes how they work. */
  paperItems: MenuItem[]
  deviceMode: MenuItem
  copyItem: MenuItem
  lockItem: MenuItem[]
  extras: { section: SheetSection; item: MenuItem | null }[]
  saveTemplate?: () => void
  onReview?: () => void
  openPrompts?: () => void
  openHistory: () => void
  openReader: () => void
  openExport: () => void
  onOpenBackup: () => void
  onOpenPage: (pageId: string | null) => void
  pastePlain: () => void
  barShown: boolean
  toggleBar: () => void
}

/**
 * Builds the page sheet's actions from what the page already does (flag
 * page.menus): every callback is the one the old ⋯ menu used.
 */
export function usePageSheetActions(i: PageSheetInput): PageSheetActions {
  const [theme, setTheme] = useDeviceSetting(themeSetting)
  return {
    // The title field is the rename box; focus it after the sheet has closed.
    rename: () =>
      window.setTimeout(() => {
        const el =
          document.querySelector<HTMLTextAreaElement>('[data-page-title]')
        el?.focus()
        el?.select()
      }, 60),
    duplicate: () => runTask(duplicateThisPage(i.db, i.page, i.toast)),
    favourite: {
      on: i.starred,
      run: () => {
        toggleFavourite(i.page.id)
        i.toast(t(i.starred ? 'fav.removed' : 'fav.added'))
      },
    },
    saveTemplate: i.saveTemplate,
    importInto: i.onOpenBackup,
    remove: () =>
      runTask(
        trashPageWithUndo(i.db, i.page, i.toast, {
          onGone: () => i.onOpenPage(i.page.parentId),
          onBack: () => i.onOpenPage(i.page.id),
        }),
      ),
    restore: i.onOpenBackup,
    reading: i.openReader,
    paperStyle: subs(i.paperItems[0]),
    paperSize: subs(i.paperItems[1]),
    deviceMode: subs(i.deviceMode) ?? [],
    toolbar: { shown: i.barShown, run: i.toggleBar },
    theme: THEMES.map((value) => ({
      label: t(`settings.theme.${value}` as MessageKey),
      checked: theme === value,
      run: () => setTheme(value),
    })),
    exportPage: i.openExport,
    copy: subs(i.copyItem)?.slice(0, 3) ?? [],
    pastePlain: i.pastePlain,
    lock: i.lockItem[0]
      ? { label: i.lockItem[0].label, run: i.lockItem[0].onSelect }
      : undefined,
    history: i.openHistory,
    review: i.onReview,
    prompts: i.openPrompts,
    search: () => getAppActions()?.openControlPanel(),
    extras: i.extras.flatMap((x) =>
      x.item
        ? [
            {
              section: x.section,
              label: x.item.label,
              run: x.item.onSelect,
              children: subs(x.item),
            },
          ]
        : [],
    ),
  }
}
