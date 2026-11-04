import { sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import type { Page } from '../core/types'
import { monthLabel, shortDayLabel } from '../journal/dates'

/** How many recent pages the sidebar lists. */
export const RECENT_SHOWN = 8

/** A page's name with a 🔒 when it is locked (the name may show; the text never). */
export function pageTitle(page: Page): string {
  return (page.locked ? '🔒 ' : '') + plainTitle(page)
}

function plainTitle(page: Page): string {
  if (page.journalDate && !page.customTitle) {
    return shortDayLabel(page.journalDate)
  }
  if (page.journalMonth && !page.customTitle) {
    return monthLabel(page.journalMonth)
  }
  return sampleName(page) || t('review.untitled')
}
