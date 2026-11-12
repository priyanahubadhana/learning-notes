/**
 * The 7 unlock switches of the page menus (spec page-menus.md, Decisions 1).
 * TODO(slice 3 settings-v3): these ids live in `src/settings/proFeatures.gen.ts`
 * on `origin/slice/3-settings-v3`. Once they arrive on build/next, read them
 * from there and delete this list; `pageUnlockIds.test.ts` fails then on purpose.
 */
export const PAGE_MENU_UNLOCK_IDS = [
  'page.slashStars',
  'page.myBlocks',
  'page.contextMore',
  'page.pastedChip',
  'page.menuAll',
  'page.blockMenuMore',
  'page.breadcrumbMore',
] as const

export type PageMenuUnlockId = (typeof PAGE_MENU_UNLOCK_IDS)[number]
