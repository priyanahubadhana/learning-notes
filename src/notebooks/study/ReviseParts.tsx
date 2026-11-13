import { useContext, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { requestSummaryField } from '../../app/studyOpen'
import type { LearningNotesDB } from '../../core/db'
import type { JsonValue } from '../../core/types'
import { Sheet } from '../../design/parts/Sheet'
import { t } from '../../i18n/t'
import { reviseLabelsSetting } from '../../settings/builtinSettings'
import { setSetting } from '../../settings/settingsService'
import { useUnlocked } from '../../settings/level'
import { useSyncedSetting } from '../../settings/useSetting'
import { LabelsEditor } from '../../settings/v3/LabelsEditor'
import { createHistory } from '../../settings/v3/settingsHistory'
import { StudyTabHeader } from './StudyTabHeader'

const LABELS_ID = 'revise.labels'

/** The Revise tab's shared header; "Labels" (Professional) edits the labels. */
export function ReviseHeader({
  db,
  count,
}: {
  db: LearningNotesDB
  count: number
}) {
  const canLabels = useUnlocked('review.reviseLabels')
  const [open, setOpen] = useState(false)
  const value = useSyncedSetting(db, reviseLabelsSetting)
  const { toast } = useContext(AppUiContext)
  const [history] = useState(() => createHistory())
  const [, bump] = useState(0)
  const write = (next: JsonValue) =>
    runTask(setSetting(db, reviseLabelsSetting, next as never))
  const step = (kind: 'undo' | 'redo') => {
    const entry = history[kind]()
    const item = entry?.items[0]
    if (item) write(kind === 'undo' ? item.before : item.after)
    bump((n) => n + 1)
  }
  const save = (next: JsonValue) => {
    history.push({
      label: t('st9.labelsTitle'),
      items: [
        { id: LABELS_ID, before: value as unknown as JsonValue, after: next },
      ],
    })
    write(next)
    bump((n) => n + 1)
    toast(t('st23.changed'), {
      label: t('annot.undo'),
      onSelect: () => step('undo'),
    })
  }
  return (
    <>
      <StudyTabHeader
        title={t('st9.title')}
        count={count}
        countLabel={t('st9.count', { count })}
        action={
          canLabels && (
            <button
              type="button"
              className="study-header__btn"
              onClick={() => setOpen(true)}
            >
              {t('st9.labels')}
            </button>
          )
        }
      />
      {open && value && (
        <Sheet
          title={t('st9.labelsTitle')}
          onClose={() => setOpen(false)}
          data-testid="revise-labels"
        >
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-50"
              disabled={!history.canUndo()}
              onClick={() => step('undo')}
            >
              {t('annot.undo')}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-50"
              disabled={!history.canRedo()}
              onClick={() => step('redo')}
            >
              {t('st23.redo')}
            </button>
          </div>
          <LabelsEditor
            value={value as unknown as JsonValue}
            descId="revise-labels-desc"
            onSave={save}
          />
        </Sheet>
      )}
    </>
  )
}

/** "My summary" lives in the Summary tab: one line that opens it at that field. */
export function EditInSummary({
  lessonId,
  onOpen,
}: {
  lessonId: string
  onOpen: (pageId: string) => void
}) {
  return (
    <p className="text-sm">
      <button
        type="button"
        className="min-h-11 rounded-lg px-1 text-accent underline underline-offset-2"
        onClick={() => {
          requestSummaryField(lessonId)
          onOpen(lessonId)
        }}
      >
        {t('st9.editInSummary')}
      </button>
    </p>
  )
}
