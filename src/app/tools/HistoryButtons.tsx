import { runHistory } from '../../editor/historyActions'
import { redo, undo, historyState } from '../../core/historySteps'
import { t } from '../../i18n/t'
import { historyTip } from '../shell/historyTips'
import { Icon } from './icons'
import { currentRunner } from './toolRuntime'

/**
 * The one Undo / Redo icon pair, always at the far left of a screen's top
 * bar (notes and paper, reading mode, the PDF / EPUB reader). It works on the
 * open page's one history (history/), with or without a text editor.
 */
export function HistoryButtons({
  className = '',
  tips = false,
}: {
  className?: string
  /** The new shell's top bar: tooltips with the keys ("Undo (Ctrl Z)"). */
  tips?: boolean
}) {
  const { canUndo, canRedo } = historyState.useValue()
  const go = (kind: 'undo' | 'redo') => {
    const editor = currentRunner().editor
    if (editor) runHistory(editor, kind)
    else void (kind === 'undo' ? undo() : redo())
  }
  const btn =
    'grid size-11 shrink-0 place-items-center rounded-xl hover:bg-hover disabled:opacity-40'
  return (
    <div
      role="group"
      aria-label={t('main.history')}
      data-slot="history"
      className={`flex shrink-0 ${className}`}
    >
      <button
        type="button"
        data-chrome
        data-testid="history-undo"
        aria-label={t('tool.undo')}
        title={tips ? historyTip('undo', t('tool.undo')) : undefined}
        disabled={!canUndo}
        className={btn}
        onClick={() => go('undo')}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        data-chrome
        data-testid="history-redo"
        aria-label={t('tool.redo')}
        title={tips ? historyTip('redo', t('tool.redo')) : undefined}
        disabled={!canRedo}
        className={btn}
        onClick={() => go('redo')}
      >
        <Icon name="redo" />
      </button>
    </div>
  )
}
