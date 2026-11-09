import { displayName } from '../i18n/defaultNames'
import { t as tr } from '../i18n/t'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import type { PickerMode } from '../app/appUi'
import type { LearningNotesDB } from '../core/db'
import { listTemplateSummaries } from './templateService'

interface TemplatePickerProps {
  db: LearningNotesDB
  workspaceId: string
  mode: PickerMode
  /** Template id, '' for Blank page, or null if cancelled. */
  onDone: (result: string | null) => void
}

/** Dialog listing templates as cards (plus "Blank page" for new pages). */
export function TemplatePicker({
  db,
  workspaceId,
  mode,
  onDone,
}: TemplatePickerProps) {
  const templates = useLiveQuery(
    () => listTemplateSummaries(db, workspaceId),
    [db, workspaceId],
  )
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const card = (
    key: string,
    title: string,
    preview: string,
    result: string,
  ) => (
    <button
      key={key}
      type="button"
      onClick={() => onDone(result)}
      className="flex min-h-[110px] flex-col gap-1.5 rounded-[10px] border border-line bg-bg p-3 text-left hover:border-accent focus-visible:border-accent focus-visible:outline-none"
    >
      <strong className="text-sm font-semibold">{title}</strong>
      <small className="text-xs leading-normal text-muted">{preview}</small>
    </button>
  )

  return (
    <dialog
      ref={ref}
      aria-label={mode === 'insert' ? tr('picker.insert') : tr('picker.new')}
      onCancel={(e) => {
        e.preventDefault()
        onDone(null)
      }}
      onClick={(e) => {
        if (e.target === ref.current) onDone(null) // click on the backdrop
      }}
      className="m-auto max-h-[86vh] w-[min(640px,calc(100vw-32px))] overflow-auto rounded-[14px] border border-line bg-surface-3 p-5 text-ink shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop:bg-[var(--scrim)]"
    >
      <h2 className="mb-1 text-[17px] font-semibold">
        {mode === 'insert' ? tr('picker.insert') : tr('picker.new')}
      </h2>
      <p className="mb-4 text-[13px] text-muted">
        {mode === 'insert' ? tr('picker.insertHelp') : tr('picker.newHelp')}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
        {mode === 'new' &&
          card('blank', tr('sidebar.blankPage'), tr('picker.blankHelp'), '')}
        {templates?.map((t) =>
          card(
            t.id,
            displayName(t.title) || tr('templates.untitled'),
            t.preview || tr('picker.emptyTemplate'),
            t.id,
          ),
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onDone(null)}
          className="rounded-lg border border-line px-3 py-1.5 text-[13px] hover:border-accent"
        >
          {tr('ui.cancel')}
        </button>
      </div>
    </dialog>
  )
}
