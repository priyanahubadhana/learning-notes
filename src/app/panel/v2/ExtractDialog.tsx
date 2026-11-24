import { useLiveQuery } from 'dexie-react-hooks'
import { useId, useState } from 'react'
import type { LearningNotesDB } from '../../../core/db'
import { ClearField } from '../../../design/parts/ClearField'
import { Dialog, NAME_MAX } from '../../../design/parts/Dialogs'
import { displayName, sampleName } from '../../../i18n/defaultNames'
import { t } from '../../../i18n/t'
import { listNotebooks } from '../../../notebooks/notebookService'
import type { ExtractTarget } from './pageOrganiseService'

const NEW = '__new__'

/**
 * NB-B46: "Extract…" asks for a name and a notebook (a new one, or one that
 * exists). A locked notebook stays in the list; choosing it is refused with
 * a message when the pages are moved.
 */
export function ExtractDialog({
  db,
  notebookId,
  count,
  onCancel,
  onSubmit,
}: {
  db: LearningNotesDB
  notebookId: string
  count: number
  onCancel(): void
  onSubmit(target: ExtractTarget): void
}) {
  const fieldId = useId()
  const selectId = useId()
  const [where, setWhere] = useState(NEW)
  const [name, setName] = useState(t('lp2.extract.newName'))
  const others = useLiveQuery(async () => {
    const here = await db.notebooks.get(notebookId)
    if (!here) return []
    return (await listNotebooks(db, here.workspaceId)).filter(
      (n) => n.id !== notebookId,
    )
  }, [db, notebookId])
  const trimmed = name.trim()
  const valid = where !== NEW || trimmed !== ''
  const submit = () => {
    if (!valid) return
    onSubmit(
      where === NEW
        ? { kind: 'new', title: trimmed }
        : { kind: 'existing', notebookId: where },
    )
  }
  return (
    <Dialog
      title={t('lp2.extract.title', { count })}
      mainLabel={t('lp2.extract.main')}
      mainDisabled={!valid}
      autoFocus="field"
      onCancel={onCancel}
      onMain={submit}
      data-testid="lpv2-extract-dialog"
    >
      <label className="fb-dialog__label" htmlFor={selectId}>
        {t('lp2.extract.where')}
      </label>
      <select
        id={selectId}
        className="lpv2-select"
        style={{ width: '100%' }}
        value={where}
        data-testid="lpv2-extract-where"
        onChange={(e) => setWhere(e.target.value)}
      >
        <option value={NEW}>{t('lp2.extract.new')}</option>
        {(others ?? []).map((n) => (
          <option key={n.id} value={n.id}>
            {displayName(sampleName(n)) || t('review.untitled')}
          </option>
        ))}
      </select>
      {where === NEW && (
        <>
          <label
            className="fb-dialog__label"
            htmlFor={fieldId}
            style={{ marginTop: 12, display: 'block' }}
          >
            {t('lp2.extract.name')}
          </label>
          <ClearField
            id={fieldId}
            value={name}
            maxLength={NAME_MAX}
            clearLabel={t('lp2.extract.clear')}
            data-testid="lpv2-extract-name"
            onChange={(e) => setName(e.target.value)}
            onClear={() => setName('')}
          />
        </>
      )}
    </Dialog>
  )
}
