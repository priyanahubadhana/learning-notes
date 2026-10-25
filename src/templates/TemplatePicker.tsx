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
      aria-label={mode === 'insert' ? 'Insert a template' : 'New page'}
      onCancel={(e) => {
        e.preventDefault()
        onDone(null)
      }}
      onClick={(e) => {
        if (e.target === ref.current) onDone(null) // click on the backdrop
      }}
      className="m-auto max-h-[86vh] w-[min(640px,calc(100vw-32px))] overflow-auto rounded-[14px] border border-line bg-bg p-5 text-ink shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop:bg-black/20"
    >
      <h2 className="mb-1 text-[17px] font-semibold">
        {mode === 'insert' ? 'Insert a template' : 'New page'}
      </h2>
      <p className="mb-4 text-[13px] text-muted">
        {mode === 'insert'
          ? 'Its blocks are added where your cursor is.'
          : 'Start blank, or from one of your templates.'}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
        {mode === 'new' &&
          card('blank', 'Blank page', 'Start from nothing', '')}
        {templates?.map((t) =>
          card(
            t.id,
            t.title || 'Untitled template',
            t.preview || 'Empty template',
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
          Cancel
        </button>
      </div>
    </dialog>
  )
}
