import { useContext, useState, type ReactNode } from 'react'
import { t } from '../../i18n/t'
import { useDeviceSetting } from '../../settings/useSetting'
import {
  readingBlanksSetting,
  readingBarPinSetting,
  readingRulerSetting,
} from '../../settings/readingSettings'
import { AppUiContext } from '../appUi'
import { requestOutline } from '../panel/outlineRequest'
import { runHistory } from '../../editor/historyActions'
import { currentRunner } from '../tools/toolRuntime'
import { useReaderHistory } from './useReaderHistory'
import { MenuPopover, type MenuItem } from '../ui'
import { Icon, type IconName } from '../tools/icons'
import {
  exitReading,
  openReadingPanel,
  toggleHideBlanks,
  toggleLineFocus,
  toggleLockToReading,
} from './readingTools'
import { readingLocked, startReading, type ReadingView } from './readingState'
import { readingPanel, type ReadingPanelName } from './useReadingSettings'

/**
 * The reader's controls (B1): the same bar in the full-screen reader and in
 * place. ✕ Exit · Contents · Bookmarks · Aa · Find · Listen · ✎ Edit (in
 * place) · ⋯. The main bar and the ribbon are hidden while reading.
 *
 * Settings › Reading › Reader bar: a small ✕ that shows the bar again when
 * you scroll up (default), always showing, or only at the top.
 */

const BUTTON =
  'grid size-11 shrink-0 place-items-center rounded-xl hover:bg-black/10 aria-pressed:bg-black/10 disabled:text-[var(--rd-soft,#999)]'

function Button({
  label,
  icon,
  onClick,
  pressed,
  disabled,
  testId,
  children,
}: {
  label: string
  icon?: IconName
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  pressed?: boolean
  disabled?: boolean
  testId?: string
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      data-chrome
      data-testid={testId}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={BUTTON}
    >
      {icon ? <Icon name={icon} /> : children}
    </button>
  )
}

export function ReaderControls({
  view,
  title,
  visible,
  showTitle,
}: {
  view: Exclude<ReadingView, 'off'>
  title: string
  /** The bar shows in full; otherwise only the small ✕ (mini mode). */
  visible: boolean
  showTitle?: boolean
}) {
  const { toast } = useContext(AppUiContext)
  const panel = readingPanel.useValue()
  const locked = readingLocked.useValue()
  const history = useReaderHistory()
  const [ruler] = useDeviceSetting(readingRulerSetting)
  const [blanks] = useDeviceSetting(readingBlanksSetting)
  const [pin, setPin] = useDeviceSetting(readingBarPinSetting)
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const toggle = (name: Exclude<ReadingPanelName, null>) =>
    openReadingPanel(name)

  const items: MenuItem[] = [
    {
      label: t('reading.ctl.lock'),
      icon: '🔒',
      checked: locked,
      onSelect: toggleLockToReading,
    },
    {
      label: t('reading.ctl.lineFocus'),
      icon: '▭',
      checked: ruler !== 'off',
      onSelect: toggleLineFocus,
    },
    {
      label: t('reading.ctl.selfTest'),
      icon: '◌',
      checked: blanks === 'hide',
      onSelect: toggleHideBlanks,
    },
    {
      label: t(view === 'reader' ? 'reading.ctl.inPlace' : 'reading.ctl.full'),
      icon: view === 'reader' ? '▤' : '⛶',
      onSelect: () => startReading(view === 'reader' ? 'inPlace' : 'reader'),
    },
  ]

  // One outline in one place: the left panel's Outline tab. The full-screen
  // reader covers the panel, so it steps back to reading in place first.
  const openContents = () => {
    if (view === 'reader') startReading('inPlace')
    requestOutline()
  }
  const exit = () => exitReading()
  if (!visible) {
    // Mini mode: only a small ✕, top left inside the safe area.
    return (
      <div
        data-chrome
        data-reader-chrome
        data-testid="reader-mini-exit"
        className="fixed top-[env(safe-area-inset-top)] left-1 z-[40]"
      >
        <button
          type="button"
          data-chrome
          aria-label={t('reading.ctl.exit')}
          onClick={exit}
          className="grid size-11 place-items-center rounded-full border border-[var(--rd-soft,#ccc)]"
          style={{
            background: 'var(--rd-bg, #fff)',
            color: 'var(--rd-fg, #000)',
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    )
  }
  return (
    <div
      data-chrome
      data-reader-chrome
      data-testid="reader-controls"
      role="toolbar"
      aria-label={t('reading.ctl.label')}
      className="reader-bar-in fixed inset-x-0 top-0 z-[40] flex min-h-[calc(3.25rem+env(safe-area-inset-top))] items-center gap-0.5 border-b px-2 pt-[env(safe-area-inset-top)]"
      style={{
        background: 'var(--rd-bg, #fff)',
        color: 'var(--rd-fg, #000)',
        borderColor: 'var(--rd-soft, #ccc)',
      }}
    >
      <Button
        label={t('reading.ctl.exit')}
        icon="close"
        testId="reader-exit"
        onClick={exit}
      />
      <Button
        label={t('tool.undo')}
        icon="undo"
        testId="reader-undo"
        disabled={!history.canUndo}
        onClick={() => {
          const ed = currentRunner().editor
          if (ed) runHistory(ed as never, 'undo')
        }}
      />
      <Button
        label={t('tool.redo')}
        icon="redo"
        testId="reader-redo"
        disabled={!history.canRedo}
        onClick={() => {
          const ed = currentRunner().editor
          if (ed) runHistory(ed as never, 'redo')
        }}
      />
      <Button
        label={t('reading.ctl.contents')}
        icon="list"
        onClick={openContents}
      />
      <Button
        label={t('reading.ctl.bookmarks')}
        icon="star"
        pressed={panel === 'bookmarks'}
        onClick={() => toggle('bookmarks')}
      />
      <Button
        label={t('reading.ctl.aa')}
        icon="textSize"
        pressed={panel === 'settings'}
        onClick={() => toggle('settings')}
      />
      <Button
        label={t('reading.ctl.find')}
        icon="search"
        pressed={panel === 'find'}
        onClick={() => toggle('find')}
      />
      <Button
        label={t('reading.ctl.listen')}
        icon="volume"
        pressed={panel === 'aloud'}
        onClick={() => toggle('aloud')}
      />
      {view === 'inPlace' && (
        <Button
          label={t('reading.ctl.edit')}
          icon="penLine"
          onClick={() => {
            if (!exitReadingForEdit()) toast(t('reading.lockedExit'))
          }}
        />
      )}
      <span className="min-w-0 flex-1 truncate ps-2 text-sm font-medium">
        {showTitle ? title || t('review.untitled') : ''}
      </span>
      <Button
        label={t(pin === 'on' ? 'reading.ctl.unpin' : 'reading.ctl.pin')}
        icon={pin === 'on' ? 'pinOff' : 'pin'}
        testId="reader-pin"
        pressed={pin === 'on'}
        onClick={() => setPin(pin === 'on' ? 'off' : 'on')}
      />
      <Button
        label={t('reading.ctl.more')}
        icon="more"
        pressed={!!menu}
        onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}
      />
      {menu && (
        <MenuPopover
          anchor={menu}
          items={items}
          label={t('reading.ctl.more')}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

/** ✎ Edit: leaves reading to write; false when "Lock to reading" is on. */
function exitReadingForEdit(): boolean {
  if (readingLocked.get()) return false
  exitReading()
  return true
}
