import { t } from '../../i18n/t'
import { openLayoutMode } from '../../paper/layoutModeBus'
import { useSheetInfo } from '../../paper/sheetNav'
import { Icon } from './icons'

/**
 * The fixed Layout button next to Undo and Redo on the main toolbar and the
 * ribbon (owner, 11 Nov): shown while a paper page is open, opens the Layout
 * pop-up for that page.
 */
export function LayoutButton({ px }: { px: number }) {
  const paper = useSheetInfo()
  if (!paper) return null
  return (
    <button
      type="button"
      data-chrome
      data-testid="main-layout"
      aria-label={t('layout.title')}
      className="grid shrink-0 place-items-center rounded-xl hover:bg-hover"
      style={{ minWidth: px, minHeight: px }}
      onClick={() => openLayoutMode(paper.pageId)}
    >
      <Icon name="grid" />
    </button>
  )
}
