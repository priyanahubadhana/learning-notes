import { useLiveQuery } from 'dexie-react-hooks'
import { useContext } from 'react'
import { AppUiContext } from '../../app/appUi'
import { RecordingRow } from '../../audio/AudioDock'
import { setAudioPanel } from '../../audio/audioActions'
import {
  deleteRecording,
  listRecordings,
  restoreRecording,
} from '../../audio/recordingService'
import type { LearningNotesDB } from '../../core/db'
import type { Recording } from '../../core/types'
import { InlineVideo } from '../../editor/fileBlock/InlineVideo'
import { t } from '../../i18n/t'

/**
 * The page's Audio & video tab: the same recordings as the left Audio panel
 * (which stays), audio overviews brought in from NotebookLM, and the videos on
 * the page, which play here.
 */
export default function AudioTab({
  db,
  pageId,
}: {
  db: LearningNotesDB
  pageId: string
}) {
  const app = useContext(AppUiContext)
  const audio = useLiveQuery(() => listRecordings(db, pageId), [db, pageId])
  const videos = useLiveQuery(
    async () =>
      (await db.bookFiles.where('pageId').equals(pageId).toArray())
        .filter((f) => f.deletedAt === null && f.mime.startsWith('video/'))
        .sort((a, b) => a.createdAt - b.createdAt),
    [db, pageId],
  )
  if (!audio || !videos) return null
  const remove = async (recording: Recording) => {
    await deleteRecording(db, recording.id)
    app.toast(t('audio.deleted'), {
      label: t('audio.undo'),
      onSelect: () => void restoreRecording(db, recording.id),
    })
  }
  return (
    <div className="grid gap-4" data-audio-tab>
      <div>
        <button
          type="button"
          onClick={() => setAudioPanel(true)}
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {t('tabs.audio.open')}
        </button>
      </div>
      {audio.length === 0 && videos.length === 0 && (
        <p className="text-sm text-muted">{t('tabs.audio.empty')}</p>
      )}
      {audio.length > 0 && (
        <section aria-label={t('tabs.audio.recordings')}>
          <h3 className="mb-2 text-sm font-semibold">
            {t('tabs.audio.recordings')}
          </h3>
          <ul className="flex flex-col gap-2">
            {audio.map((r) => (
              <RecordingRow
                key={r.id}
                recording={r}
                onDelete={() => void remove(r)}
              />
            ))}
          </ul>
        </section>
      )}
      {videos.length > 0 && (
        <section aria-label={t('tabs.audio.videos')} className="grid gap-3">
          <h3 className="text-sm font-semibold">{t('tabs.audio.videos')}</h3>
          {videos.map((f) => (
            <div key={f.id} className="grid gap-1">
              <p className="truncate text-sm">{f.name}</p>
              <InlineVideo id={f.id} name={f.name} />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
