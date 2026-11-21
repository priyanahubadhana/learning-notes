import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'
import { nameSheetResult } from './nameSheetLogic'

/**
 * The "Name it" sheet: a centred dialog with a large text field, used to
 * name a new notebook or page and to rename one. It replaces the small inline
 * name box on touch and Pencil devices, where a palm or Pencil tip hit the
 * row's buttons around it and Scribble had no room.
 *
 * It is a native modal dialog: everything behind it is inert, focus stays
 * inside, Esc cancels. Enter means Done; an empty or unchanged name is
 * the same as Cancel (the item keeps its current name).
 */
export function NameSheet({
  title,
  initial,
  placeholder,
  onDone,
  onCancel,
}: {
  title: string
  initial: string
  /** Gray hint shown while the box is empty (a new notebook's default name). */
  placeholder?: string
  /** A new, non-empty name. */
  onDone: (name: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initial)

  useEffect(() => {
    ref.current?.showModal()
    input.current?.focus()
    // Caret at the end, nothing selected: the Pencil's handwriting (Scribble)
    // turns into a selection gesture over selected text (L12).
    const end = input.current?.value.length ?? 0
    input.current?.setSelectionRange(end, end)
  }, [])

  const finish = () => {
    const name = nameSheetResult(value, initial)
    if (name === null) onCancel()
    else onDone(name)
  }

  return createPortal(
    <dialog
      ref={ref}
      data-testid="name-sheet"
      data-palm-guard
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          finish()
        }}
      >
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        <div className="relative mb-5">
          <input
            ref={input}
            value={value}
            aria-label={t('ui.name')}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="sentences"
            onChange={(e) => setValue(e.target.value)}
            style={{ minHeight: 56 }}
            className="box-border w-full rounded-xl border border-line bg-bg pl-4 pr-14 text-xl outline-none placeholder:text-muted focus:border-accent"
          />
          {value && (
            <button
              type="button"
              aria-label={t('nameSheet.clear')}
              onClick={() => {
                setValue('')
                input.current?.focus()
              }}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 min-w-20 rounded-lg px-4 text-muted hover:bg-hover hover:text-ink"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="submit"
            className="min-h-11 min-w-20 rounded-lg bg-accent px-4 font-medium text-white"
          >
            {t('bar.done')}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}
