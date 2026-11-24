import { useState, useSyncExternalStore } from 'react'
import { ClearField } from '../../design/parts/ClearField'
import {
  browserDeps,
  downloadTour,
  downloadedTour,
  removeTour,
  TOURS_KEY,
  type TourStatus,
} from '../../help/tours/tourDownload'
import { GUIDE_STEPS, TOUR_LIST } from '../../help/tours/tourList'
import { getExperience } from './experience'
import { TourPlayer } from './TourPlayer'
import { tv, type V3Key } from './tv'

// The downloaded list is device-only; every row reads it from storage.
const listeners = new Set<() => void>()
const bump = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const snapshot = () => {
  try {
    return globalThis.localStorage?.getItem(TOURS_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * SET-B22 / B23: the Tours library. Our own guide is built in (works offline);
 * every other tour shows its size and a Download button. Nothing is downloaded
 * until the person taps. Progress, "Ready", the offline line and Replay.
 */
export function ToursLibrary({
  onShow,
}: {
  onShow(settingId: string, sectionId: string): void
}) {
  useSyncExternalStore(subscribe, snapshot, () => '')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<
    Record<string, { s: TourStatus; pct: number }>
  >({})
  const [playing, setPlaying] = useState<{
    name: string
    steps: readonly string[]
  } | null>(null)

  const exp = getExperience() ?? 'little'
  const guideSteps = GUIDE_STEPS[exp]
  const q = query.trim().toLowerCase()
  const match = (name: string, desc: string) =>
    !q || `${name} ${desc}`.toLowerCase().includes(q)

  const guideName = tv('sv3.tours.guide.name')
  const showGuide = match(guideName, tv('sv3.tours.guide.desc'))
  const shown = TOUR_LIST.filter((e) =>
    match(
      tv(`sv3.tours.${e.id}.name` as V3Key),
      tv(`sv3.tours.${e.id}.desc` as V3Key),
    ),
  )

  const download = async (id: string) => {
    const entry = TOUR_LIST.find((e) => e.id === id)
    if (!entry) return
    setStatus((m) => ({ ...m, [id]: { s: 'downloading', pct: 0 } }))
    const result = await downloadTour(entry, browserDeps, (f) =>
      setStatus((m) => ({
        ...m,
        [id]: { s: 'downloading', pct: Math.round(f * 100) },
      })),
    )
    setStatus((m) => ({ ...m, [id]: { s: result, pct: 100 } }))
    bump()
  }

  return (
    <section
      data-tours-library
      data-setting-id="help.tours"
      aria-labelledby="sv3-tours-title"
      className="sv3-row"
    >
      <h3 id="sv3-tours-title" className="sv3-row-name">
        {tv('sv3.tours.title')}
      </h3>
      <p className="sv3-line-help">{tv('sv3.tours.lead')}</p>
      <ClearField
        type="search"
        value={query}
        placeholder={tv('sv3.tours.search')}
        aria-label={tv('sv3.tours.search')}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
      />
      <ul className="sv3-tours">
        {showGuide && (
          <li data-tour-row="guide" className="sv3-tour-row">
            <div className="sv3-tour-text">
              <span className="sv3-row-name">
                {guideName}{' '}
                <span className="sv3-tag">{tv('sv3.tours.builtIn')}</span>
              </span>
              <span className="sv3-line-help">
                {tv('sv3.tours.guide.desc')}{' '}
                {tv('sv3.tours.steps', { count: guideSteps.length })}
              </span>
            </div>
            <button
              type="button"
              className="sv3-btn"
              data-tour-replay="guide"
              onClick={() => setPlaying({ name: guideName, steps: guideSteps })}
            >
              {tv('sv3.tours.replay')}
            </button>
          </li>
        )}
        {shown.map((e) => {
          const name = tv(`sv3.tours.${e.id}.name` as V3Key)
          const have = downloadedTour(e.id, browserDeps)
          const st = status[e.id]
          const busy = st?.s === 'downloading'
          return (
            <li key={e.id} data-tour-row={e.id} className="sv3-tour-row">
              <div className="sv3-tour-text">
                <span className="sv3-row-name">
                  {name}{' '}
                  {have && (
                    <span className="sv3-tag">{tv('sv3.tours.ready')}</span>
                  )}
                </span>
                <span className="sv3-line-help">
                  {tv(`sv3.tours.${e.id}.desc` as V3Key)}{' '}
                  {tv('sv3.tours.size', {
                    kb: Math.max(0.1, Math.round(e.bytes / 100) / 10),
                  })}
                </span>
                {busy && (
                  <progress
                    value={st.pct}
                    max={100}
                    aria-label={tv('sv3.tours.downloading', {
                      percent: st.pct,
                    })}
                  />
                )}
                <span role="status" className="sv3-line-help">
                  {busy
                    ? tv('sv3.tours.downloading', { percent: st.pct })
                    : st?.s === 'offline'
                      ? tv('sv3.tours.offline')
                      : st?.s === 'failed'
                        ? tv('sv3.tours.failed')
                        : ''}
                </span>
              </div>
              {have ? (
                <div className="sv3-tour-actions">
                  <button
                    type="button"
                    className="sv3-btn"
                    data-tour-replay={e.id}
                    onClick={() =>
                      setPlaying({
                        name,
                        steps: have.steps.map((s) => s.setting),
                      })
                    }
                  >
                    {tv('sv3.tours.replay')}
                  </button>
                  <button
                    type="button"
                    className="sv3-btn"
                    aria-label={tv('sv3.tours.removeLabel', { name })}
                    onClick={() => {
                      removeTour(e.id, browserDeps)
                      setStatus((m) => ({
                        ...m,
                        [e.id]: { s: 'idle', pct: 0 },
                      }))
                      bump()
                    }}
                  >
                    {tv('sv3.tours.remove')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="sv3-btn sv3-btn-primary"
                  data-tour-download={e.id}
                  disabled={busy}
                  onClick={() => void download(e.id)}
                >
                  {tv('sv3.tours.download')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {!showGuide && shown.length === 0 && (
        <p role="status" className="sv3-line-help">
          {tv('sv3.tours.none', { query: query.trim() })}
        </p>
      )}
      {playing && (
        <TourPlayer
          name={playing.name}
          steps={playing.steps}
          onShow={onShow}
          onClose={() => setPlaying(null)}
        />
      )}
    </section>
  )
}
