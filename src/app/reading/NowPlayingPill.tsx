import { t } from '../../i18n/t'
import { Icon } from '../tools/icons'
import {
  aloudState,
  nowPlaying,
  pauseAloud,
  resumeAloud,
  stopAloud,
} from './aloudController'

/**
 * Now playing (B4): while the page is being read aloud, a small pill on
 * every screen with the title, ⏯ and ⏹. Leaving the page never leaves
 * speech running without it; ⏹ always stops. Above the phone tab bar; in
 * the bottom corner on a tablet or computer.
 */
export function NowPlayingPill({
  onOpenPage,
}: {
  onOpenPage: (pageId: string) => void
}) {
  const state = aloudState.useValue()
  const playing = nowPlaying.useValue()
  if (state === 'idle' || !playing) return null
  const btn =
    'grid size-11 shrink-0 place-items-center rounded-full hover:bg-hover'
  return (
    <div
      data-chrome
      data-testid="now-playing"
      role="region"
      aria-label={t('reading.nowPlaying')}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-[45] flex max-w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-bg py-0.5 ps-4 pe-1 text-ink shadow-[0_6px_20px_rgba(0,0,0,0.16)] phone:bottom-[calc(env(safe-area-inset-bottom)+4.25rem)]"
    >
      <button
        type="button"
        data-chrome
        onClick={() => onOpenPage(playing.pageId)}
        className="min-h-11 min-w-0 flex-1 truncate text-start text-sm"
      >
        {playing.title || t('review.untitled')}
      </button>
      <button
        type="button"
        data-chrome
        aria-label={t(
          state === 'playing' ? 'reading.aloud.pause' : 'reading.aloud.resume',
        )}
        onClick={state === 'playing' ? pauseAloud : resumeAloud}
        className={btn}
      >
        <span aria-hidden>{state === 'playing' ? '⏸' : '▶'}</span>
      </button>
      <button
        type="button"
        data-chrome
        aria-label={t('reading.aloud.stop')}
        onClick={stopAloud}
        className={btn}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
