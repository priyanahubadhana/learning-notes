import { IconButton } from '../app/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import type { LearningNotesDB } from '../core/db'
import { isFreshReplay, useReplayRequest } from '../core/replay'
import type { Recording } from '../core/types'
import { t } from '../i18n/t'
import {
  setAudioPanel,
  toggleRecording,
  useAudioPanelOpen,
} from './audioActions'
import { setRecorderNotice, useRecorder } from './recorder'
import {
  deleteRecording,
  eraseRecordings,
  formatDuration,
  listRecordings,
  restoreRecording,
} from './recordingService'

const button =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3 text-sm text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent'

/** Seconds since the recording began, re-read twice a second. */
function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [startedAt])
  return startedAt === null ? 0 : Math.max(0, now - startedAt)
}

/**
 * Plays from a moment. A recording made by the browser often has no length
 * written in it, and then a seek does nothing until the end is found: jump to
 * a huge time first, and seek for real when the player has moved.
 */
function seekAndPlay(audio: HTMLAudioElement, seconds: number) {
  const go = () => {
    audio.currentTime = seconds
    void audio.play().catch(() => {})
  }
  if (Number.isFinite(audio.duration)) return go()
  const fix = () => {
    audio.removeEventListener('timeupdate', fix)
    go()
  }
  audio.addEventListener('timeupdate', fix)
  audio.currentTime = 1e101
}

/** One recording: name, length, Play (the sound is loaded only then) and Delete. */
function RecordingRow({
  recording,
  onDelete,
}: {
  recording: Recording
  onDelete: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  // Where a tapped drawing asks this recording to start (core/replay.ts).
  const replay = useReplayRequest()
  const seek = useRef<number | null>(null)
  const handled = useRef(0)
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )
  const play = () => {
    setFailed(false)
    setUrl(
      URL.createObjectURL(new Blob([recording.data], { type: recording.type })),
    )
  }
  const applySeek = () => {
    const audio = audioRef.current
    if (!audio || seek.current === null) return
    const seconds = seek.current
    seek.current = null
    seekAndPlay(audio, seconds)
  }
  useEffect(() => {
    if (
      !replay ||
      replay.recordingId !== recording.id ||
      !isFreshReplay(replay) ||
      handled.current === replay.nonce
    ) {
      return
    }
    handled.current = replay.nonce
    seek.current = replay.seconds
    // After this render: the sound is made and the player mounts first.
    queueMicrotask(() => {
      if (url) applySeek()
      else play()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per request
  }, [replay?.nonce])
  return (
    <li
      data-testid="recording-row"
      className="rounded-lg border border-line bg-bg p-2"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">
            {recording.name}
          </div>
          <div className="text-xs text-muted">
            {formatDuration(recording.durationMs)}
          </div>
        </div>
        {!url && (
          <button type="button" className={button} onClick={play}>
            {t('audio.play')}
          </button>
        )}
        <button
          type="button"
          className={button}
          onClick={onDelete}
          aria-label={`${t('audio.delete')}: ${recording.name}`}
        >
          {t('audio.delete')}
        </button>
      </div>
      {url && (
        <audio
          className="mt-2 w-full"
          controls
          autoPlay
          ref={audioRef}
          onLoadedMetadata={applySeek}
          src={url}
          aria-label={t('audio.playing', { name: recording.name })}
          onError={() => setFailed(true)}
        />
      )}
      {failed && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {t('audio.cantPlay')}
        </p>
      )}
    </li>
  )
}

/** The left panel's Audio list for the open page. */
function AudioPanel({
  db,
  pageId,
}: {
  db: LearningNotesDB
  pageId: string | null
}) {
  const app = useContext(AppUiContext)
  const recorder = useRecorder()
  const elapsed = useElapsed(
    recorder.status === 'recording' ? recorder.startedAt : null,
  )
  const live = useLiveQuery(
    () => (pageId ? listRecordings(db, pageId) : []),
    [db, pageId],
  )
  const deleted = useLiveQuery(
    () => (pageId ? listRecordings(db, pageId, true) : []),
    [db, pageId],
  )
  const recordingHere =
    recorder.status === 'recording' && recorder.pageId === pageId
  const recordingElsewhere = recorder.status === 'recording' && !recordingHere

  const remove = async (recording: Recording) => {
    await deleteRecording(db, recording.id)
    app.toast(t('audio.deleted'), {
      label: t('audio.undo'),
      onSelect: () => void restoreRecording(db, recording.id),
    })
  }
  const erase = async (recording: Recording) => {
    const answer = await app.choose({
      title: t('audio.forever.title'),
      message: t('audio.forever.message'),
      options: [
        { value: 'no', label: t('dialog.cancel'), primary: true },
        { value: 'yes', label: t('audio.forever.confirm') },
      ],
    })
    if (answer === 'yes') await eraseRecordings(db, [recording.id])
  }

  return (
    <aside
      data-chrome
      data-testid="audio-panel"
      aria-label={t('audio.panel.title')}
      className="fixed inset-y-0 left-0 z-[var(--z-popup)] flex w-[min(22rem,92vw)] flex-col border-r border-line bg-side shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-line p-2">
        <div role="tablist" className="flex-1">
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-ink"
          >
            {t('audio.panel.title')}
          </button>
        </div>
        <IconButton
          tip="audio.panelClose"
          bare
          tipClassName="inline-flex shrink-0"
          type="button"
          className={button}
          onClick={() => setAudioPanel(false)}
          aria-label={t('audio.panel.close')}
        >
          ✕
        </IconButton>
      </div>
      <div className="overflow-y-auto p-3">
        <button
          type="button"
          data-testid="audio-record"
          disabled={recorder.status === 'saving' || recordingElsewhere}
          onClick={() => void toggleRecording(pageId, app.toast)}
          className={`${button} w-full gap-2 ${recordingHere ? 'border-danger text-danger' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-3 w-3 ${recordingHere ? 'rounded-sm' : 'rounded-full'} bg-danger`}
          />
          {recordingHere
            ? `${t('audio.stop')} · ${formatDuration(elapsed)}`
            : t('audio.record')}
        </button>
        <p className="mt-2 text-xs text-muted">
          {recordingElsewhere ? t('audio.elsewhere') : t('audio.recordHint')}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {(live ?? []).map((recording) => (
            <RecordingRow
              key={recording.id}
              recording={recording}
              onDelete={() => void remove(recording)}
            />
          ))}
        </ul>
        {live && live.length === 0 && (
          <p className="mt-3 text-sm text-muted">{t('audio.list.empty')}</p>
        )}
        {deleted && deleted.length > 0 && (
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-ink-soft">
              {t('audio.deletedTitle', { count: deleted.length })}
            </summary>
            <ul className="flex flex-col gap-2">
              {deleted.map((recording) => (
                <li
                  key={recording.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {recording.name} · {formatDuration(recording.durationMs)}
                  </span>
                  <button
                    type="button"
                    className={button}
                    onClick={() => void restoreRecording(db, recording.id)}
                  >
                    {t('audio.restore')}
                  </button>
                  <button
                    type="button"
                    className={`${button} text-danger`}
                    onClick={() => void erase(recording)}
                  >
                    {t('audio.deleteForever')}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </aside>
  )
}

/**
 * Everything audio that sits above the screens: the Audio list (left panel)
 * and the red "Recording" chip that stays on screen while a recording runs,
 * so it is never forgotten, whichever page is open.
 */
export function AudioDock({
  db,
  pageId,
}: {
  db: LearningNotesDB
  pageId: string | null
}) {
  const app = useContext(AppUiContext)
  const open = useAudioPanelOpen()
  const recorder = useRecorder()
  const elapsed = useElapsed(
    recorder.status === 'recording' ? recorder.startedAt : null,
  )
  // A drawing was tapped to hear what was said while it was written.
  const replay = useReplayRequest()
  useEffect(() => {
    if (replay && isFreshReplay(replay)) setAudioPanel(true)
  }, [replay])
  useEffect(() => {
    setRecorderNotice((message) => app.toast(message))
    return () => setRecorderNotice(null)
  }, [app])

  return (
    <>
      {open && <AudioPanel db={db} pageId={pageId} />}
      {recorder.status === 'recording' && !open && (
        <div
          data-chrome
          data-testid="recording-chip"
          role="status"
          className="fixed bottom-24 left-1/2 z-[var(--z-popup)] flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-side py-1 pr-1 pl-4 shadow-lg"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-danger"
          />
          <span className="text-sm text-ink tabular-nums">
            {t('audio.recording')} {formatDuration(elapsed)}
          </span>
          <button
            type="button"
            className={button}
            onClick={() => setAudioPanel(true)}
            aria-label={t('audio.panel.open')}
          >
            {t('audio.panel.title')}
          </button>
          <button
            type="button"
            className={`${button} border-danger text-danger`}
            onClick={() => void toggleRecording(pageId, app.toast)}
            aria-label={t('audio.stopLabel')}
          >
            {t('audio.stop')}
          </button>
        </div>
      )}
    </>
  )
}
