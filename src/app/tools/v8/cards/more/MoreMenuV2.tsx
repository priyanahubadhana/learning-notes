import {
  CardGroup,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { FoldGroup } from '../../../../../design/parts/FoldGroup'
import '../../../../../design/parts/Card.css'
import { t } from '../../../../../i18n/t'
import { useUnlocked } from '../../../../../settings/level'
import { requestHideToolBar } from '../../../toolbarVisibility'
import { Icon, type IconName } from '../../../icons'
import { runTool } from '../../../toolRegistry'
import type { FoldEntry } from '../../FoldCard'

/**
 * The tool bar's ⋯ card in the redesigned look (flag `toolbar.menu`, 2A.2):
 * the four app actions as one row of icon tiles, then the tools that did not
 * fit as a tile grid. Same items as the flat list (FoldCard entries +
 * MoreExtras); no key names; the first stop is a quiet group, so a tap draws
 * no focus ring (the ring shows when Tab moves on).
 */
export default function MoreMenuV2({
  entries,
  onAllTools,
  onClose,
}: {
  entries: FoldEntry[]
  onAllTools: () => void
  onClose: () => void
}) {
  const allTools = useUnlocked('tb.allTools')
  const run = (id: string) => {
    onClose()
    runTool(id)
  }
  const top: {
    id: string
    icon: IconName
    label: string
    testId: string
    onPick: () => void
  }[] = [
    {
      id: 'reading',
      icon: 'eye',
      label: t('tool.readingMode'),
      testId: 'v8-more-reading',
      onPick: () => run('readingMode'),
    },
    ...(allTools
      ? [
          {
            id: 'alltools',
            icon: 'grid' as IconName,
            label: t('v8.more.allTools'),
            testId: 'v8-more-alltools',
            onPick: onAllTools,
          },
        ]
      : []),
    {
      id: 'settings',
      icon: 'settings',
      label: t('tool.settings'),
      testId: 'v8-more-settings',
      onPick: () => run('settings'),
    },
    {
      id: 'hide',
      icon: 'eyeOff',
      label: t('v8.more.hideBar'),
      testId: 'v8-more-hide',
      onPick: () => {
        onClose()
        void requestHideToolBar()
      },
    },
  ]
  return (
    <div
      data-menu-v2
      role="group"
      aria-label={t('v8.fold.title')}
      // Not a keyboard stop (Tab goes to the first tile); no ring round it.
      tabIndex={-1}
      className="grid gap-3 outline-none"
    >
      <CardGroup>
        <TileGroup label={t('v8.more.groupApp')} action columns={top.length}>
          {top.map((x) => (
            <Tile
              key={x.id}
              label={x.label}
              action
              testId={x.testId}
              onSelect={x.onPick}
            >
              <Icon name={x.icon} size={22} />
            </Tile>
          ))}
        </TileGroup>
      </CardGroup>
      {entries.length > 0 && (
        <FoldGroup label={t('toolbarMenu.groupFolded')} defaultOpen>
          <TileGroup label={t('toolbarMenu.groupFolded')} action columns={4}>
            {entries.map((e) => (
              <Tile
                key={e.id}
                label={e.label}
                action
                pressed={e.pressed}
                testId={`v8-fold-${e.id}`}
                onSelect={e.onPick}
              >
                <Icon name={e.icon ?? 'more'} size={22} />
              </Tile>
            ))}
          </TileGroup>
        </FoldGroup>
      )}
    </div>
  )
}
