import { Suspense } from 'react'
import {
  CardGroup,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import '../../../../../design/parts/Card.css'
import { t } from '../../../../../i18n/t'
import { setKeyboard } from '../../../../../editor/keyboardPolicy'
import { requestHideToolBar } from '../../../toolbarVisibility'
import { Icon, type IconName } from '../../../icons'
import { runTool } from '../../../toolRegistry'
import type { Editor } from '../../../../../editor/barActions'
import { lazyNow } from '../../../../lazyNow'
import type { FoldEntry } from '../../FoldCard'

const MoreStudy = lazyNow(() => import('./MoreStudy'))
const MoreTools = lazyNow(() => import('./MoreTools'))

/**
 * The tool bar's ⋯ card in the redesigned look (flag `toolbar.menu`, 2A.2):
 * the four app actions as one row of icon tiles, then the tools that did not
 * fit as a tile grid. Same items as the flat list (FoldCard entries +
 * MoreExtras); no key names; the first stop is a quiet group, so a tap draws
 * no focus ring (the ring shows when Tab moves on).
 */
export default function MoreMenuV2({
  entries,
  editor,
  onAllTools,
  onClose,
}: {
  entries: FoldEntry[]
  /** The page's editor: the study and copy groups need it (left out without). */
  editor?: Editor | null
  onAllTools: () => void
  onClose: () => void
}) {
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
    ...(editor
      ? [
          {
            id: 'keyboard',
            icon: 'keyboard' as IconName,
            label: t('main.keyboard'),
            testId: 'v8-more-keyboard',
            onPick: () => {
              onClose()
              setKeyboard(editor, true)
            },
          },
        ]
      : []),
    {
      id: 'reading',
      icon: 'eye',
      label: t('tool.readingMode'),
      testId: 'v8-more-reading',
      onPick: () => run('readingMode'),
    },
    {
      id: 'search',
      icon: 'search',
      label: t('tool.search'),
      testId: 'v8-more-search',
      onPick: () => run('search'),
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
        <CardGroup label={t('v8.more.onThisBar')}>
          <TileGroup label={t('v8.more.onThisBar')} action columns={3}>
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
        </CardGroup>
      )}
      {editor ? (
        <Suspense fallback={null}>
          <MoreStudy editor={editor} onClose={onClose} />
          <MoreTools onClose={onClose} onAllTools={onAllTools} />
        </Suspense>
      ) : null}
    </div>
  )
}
