import type { ReactNode } from 'react'
import { FoldGroup } from '../../../../../design/parts/FoldGroup'
import '../../../../../design/parts/Card.css'
import { t, type MessageKey } from '../../../../../i18n/t'
import { useLevel, useUnlocked } from '../../../../../settings/level'
import { Icon, type IconName } from '../../../icons'
import { findTool, runTool } from '../../../toolRegistry'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/** [tool id, Professional only]: only tools that exist today (2A.12). */
const VIEW: [string, boolean][] = [
  ['lineFocus', false],
  ['theme', true],
  ['zoom', true],
]
const PAGE: [string, boolean][] = [
  ['share', true],
  ['saveRestore', true],
]
const BAR: [string, boolean][] = [['shortBar', false]]

/**
 * The ⋯ card's View, Page and Tool bar folds (v9, 2A.12). Each row runs an
 * existing tool through the registry; nothing here has its own setting.
 */
export default function MoreTools({
  onClose,
  onAllTools,
}: {
  onClose: () => void
  onAllTools: () => void
}) {
  const pro = useLevel() === 'professional'
  const allTools = useUnlocked('tb.allTools')
  const group = (
    id: string,
    label: MessageKey,
    items: [string, boolean][],
    icon: IconName,
    extra?: ReactNode,
  ) => {
    const rows = items.filter(([, proOnly]) => pro || !proOnly)
    if (rows.length === 0 && !extra) return null
    return (
      <FoldGroup
        label={t(label)}
        icon={<Icon name={icon} size={18} />}
        testId={`more-group-${id}`}
      >
        {rows.map(([tool]) => (
          <button
            key={tool}
            type="button"
            data-chrome
            data-testid={`v8-more-tool-${tool}`}
            className="v8fold-row"
            onMouseDown={keepFocus}
            onClick={() => {
              onClose()
              runTool(tool)
            }}
          >
            <Icon name={findTool(tool)?.icon ?? icon} size={18} />
            <span>{t(`tool.${tool}` as MessageKey)}</span>
          </button>
        ))}
        {extra}
      </FoldGroup>
    )
  }
  return (
    <>
      {group('view', 'v8.more.groupView', VIEW, 'eye')}
      {group('page', 'v8.more.groupPage', PAGE, 'fileText')}
      {group(
        'bar',
        'v8.more.groupBar',
        BAR,
        'settings',
        <>
          <button
            type="button"
            data-chrome
            data-testid="v8-more-settings"
            className="v8fold-row"
            onMouseDown={keepFocus}
            onClick={() => {
              onClose()
              runTool('settings')
            }}
          >
            <Icon name="settings" size={18} />
            <span>{t('tool.settings')}</span>
          </button>
          {allTools ? (
            <button
              type="button"
              data-chrome
              data-testid="v8-more-alltools"
              className="v8fold-row"
              onMouseDown={keepFocus}
              onClick={onAllTools}
            >
              <Icon name="grid" size={18} />
              <span>{t('v8.more.allTools')}</span>
            </button>
          ) : null}
        </>,
      )}
    </>
  )
}
