import { t, type MessageKey } from '../../../i18n/t'
import { EditListSheet, type SheetItem } from '../EditListSheet'
import { allTools, toolLabel } from '../toolRegistry'
import { currentBar, mainToken, saveBar, toolToken } from './barOrder'
import { TOOL_ICON } from './mainToolIcons'
import {
  MAIN_TOOLS,
  PILL_OPTIONS,
  pillOptionsOf,
  pillLists,
  setPillOptions,
  type PillTool,
} from './mainTools'

/**
 * "Edit toolbar" (R7-11): the dedicated screen for the main bar. The bar is
 * one list of the main tools and the pinned tools together; every other tool
 * of the app waits under "More tools". Lazy-loaded (see DockedBar).
 */

/** Tools that are always on the bar's left and cannot be pinned again. */
const NOT_PINNABLE = new Set(['undo', 'redo', 'more', 'newLine'])

function toolbarItems(): SheetItem[] {
  const main: SheetItem[] = MAIN_TOOLS.map((id) => ({
    id: mainToken(id),
    label: t(`main.tool.${id}` as MessageKey),
    icon: TOOL_ICON[id],
  }))
  const others: SheetItem[] = allTools()
    .filter((tool) => !NOT_PINNABLE.has(tool.id))
    .map((tool) => ({
      id: toolToken(tool.id),
      label: toolLabel(tool),
      icon: tool.icon,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return [...main, ...others]
}

export function EditToolbarSheet({ onClose }: { onClose: () => void }) {
  return (
    <EditListSheet
      scope="bar"
      title={t('editBar.title')}
      hint={t('editBar.hint')}
      items={toolbarItems()}
      value={currentBar()}
      defaults={[...MAIN_TOOLS].map(mainToken)}
      // At least one main tool stays (the bar can never be lost).
      canRemove={(id, draft) =>
        !id.startsWith('m:') ||
        draft.filter((x) => x.startsWith('m:')).length > 1
      }
      onCommit={saveBar}
      onClose={onClose}
    />
  )
}

/** The same sheet for the options of one pill. */
export function EditPillSheet({
  tool,
  onClose,
}: {
  tool: PillTool
  onClose: () => void
}) {
  const items: SheetItem[] = PILL_OPTIONS[tool].map((id) => ({
    id,
    label: t(`main.opt.${tool}.${id}` as MessageKey),
  }))
  return (
    <EditListSheet
      scope={`pill-${tool}`}
      title={t('editBar.pillTitle', {
        name: t(`main.tool.${tool}` as MessageKey),
      })}
      items={items}
      value={pillOptionsOf(tool, pillLists.get())}
      canRemove={() => true}
      onCommit={(next) => setPillOptions(tool, next)}
      onClose={onClose}
    />
  )
}
