import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HelpLine, Tip } from '../../help/Help'
import { t, type MessageKey } from '../../i18n/t'
import { MathView } from './MathView'
import { renderMath } from './render'
import {
  CATEGORIES,
  insertSnippet,
  PALETTE,
  snippetLabel,
  type Category,
} from './snippets'

/** One palette button: the symbol is drawn, tapping adds its LaTeX. */
function PaletteButton({
  label,
  tex,
  onInsert,
}: {
  label: string
  tex: string
  onInsert: (tex: string) => void
}) {
  const html = useMemo(() => renderMath(label, false).html, [label])
  return (
    <button
      type="button"
      aria-label={tex.replace('@@', '').trim()}
      // Keep the focus (and the iPad keyboard) in the LaTeX box.
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') e.preventDefault()
      }}
      onClick={() => onInsert(tex)}
      className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-line bg-bg px-2 text-[15px] hover:border-accent hover:bg-hover"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * The maths editor (N1): a pop-up with the formula drawn live, a box for
 * the LaTeX, and a palette of buttons (fractions, roots, sums, Greek
 * letters, symbols, statistics formulas) that write the LaTeX for you.
 * It is a modal dialog in the page body, loaded only when first opened.
 */
export function MathEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (latex: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const [latex, setLatex] = useState(initial)
  const [category, setCategory] = useState<Category>('basics')

  useEffect(() => {
    ref.current?.showModal()
    const el = box.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  const insert = (tex: string) => {
    const el = box.current
    if (!el) return
    const next = insertSnippet(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      tex,
    )
    setLatex(next.value)
    // The box shows the new text on the next paint; put the cursor after it.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(next.caret, next.caret)
    })
  }

  return createPortal(
    <dialog
      ref={ref}
      aria-label={t('math.editor')}
      data-math-editor
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel() // click on the backdrop
      }}
      className="m-auto max-h-[92vh] w-[min(640px,calc(100vw-24px))] overflow-auto rounded-[14px] border border-line bg-bg p-4 text-ink shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop:bg-black/20"
    >
      <h2 className="mb-2 text-[16px] font-semibold">{t('math.editor')}</h2>
      <div
        data-math-preview
        className="mb-3 min-h-16 rounded-lg bg-soft px-3 py-2"
      >
        <MathView latex={latex} />
      </div>
      <label
        className="mb-1 block text-[13px] text-ink-soft"
        htmlFor="math-tex"
      >
        {t('math.latex')}
      </label>
      <textarea
        id="math-tex"
        ref={box}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSave(latex)
          }
        }}
        rows={3}
        dir="ltr"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-bg p-2 font-mono text-[14px] focus:border-accent focus:outline-none"
      />
      <HelpLine id="math.latex" className="mt-1 mb-3 text-xs text-muted" />

      <div
        role="group"
        aria-label={t('math.palette')}
        className="mb-2 inline-flex flex-wrap gap-0.5 rounded-[10px] bg-hover p-[2px]"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className="min-h-11 rounded-[8px] px-3 text-[13px] text-ink-soft aria-pressed:bg-bg aria-pressed:text-ink"
          >
            {t(`math.cat.${c}` as MessageKey)}
          </button>
        ))}
      </div>
      <Tip id="math.palette" className="mb-3 block">
        <div className="flex flex-wrap gap-1.5">
          {PALETTE[category].map((snippet) => (
            <PaletteButton
              key={snippet.tex}
              label={snippetLabel(snippet)}
              tex={snippet.tex}
              onInsert={insert}
            />
          ))}
        </div>
      </Tip>

      <div className="flex justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-3 py-1.5 text-muted hover:bg-hover hover:text-ink"
        >
          {t('ui.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onSave(latex)}
          className="min-h-11 rounded-lg bg-accent px-4 py-1.5 font-medium text-white"
        >
          {t('math.done')}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
