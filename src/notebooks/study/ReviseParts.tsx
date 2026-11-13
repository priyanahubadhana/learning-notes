import { useState } from 'react'
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
import { StudyTabHeader } from './StudyTabHeader'

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
              className="study-header__action"
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
          <LabelsEditor
            value={value as unknown as JsonValue}
            descId="revise-labels-desc"
            onSave={(next) =>
              void setSetting(db, reviseLabelsSetting, next as never)
            }
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
