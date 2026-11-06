import { useEffect, useRef, useState } from 'react'
import { MAX_NOTE_LENGTH } from '../../core/sourceCheck'
import { t } from '../../i18n/t'

/** A small sheet to write or edit the note of a highlight. */
export function NoteSheet({
  quote,
  initial = '',
  onSave,
  onCancel,
}: {
  quote?: string
  initial?: string
  onSave: (note: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('annot.noteLabel')}
      className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-md rounded-xl border border-line bg-bg p-3 shadow-xl"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      {quote && (
        <p className="mb-2 line-clamp-2 text-xs text-muted italic">“{quote}”</p>
      )}
      <textarea
        ref={ref}
        rows={4}
        maxLength={MAX_NOTE_LENGTH}
        value={text}
        placeholder={t('annot.notePlaceholder')}
        aria-label={t('annot.noteLabel')}
        data-testid="note-text"
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
        >
          {t('annot.cancel')}
        </button>
        <button
          type="button"
          data-testid="note-save"
          onClick={() => onSave(text.trim())}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('annot.save')}
        </button>
      </div>
    </div>
  )
}
