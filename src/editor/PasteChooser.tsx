import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'
import {
  closePasteUi,
  pasteUiState,
  pasteUiSubscribe,
  labelKey,
  previewOf,
  type ChooserRequest,
} from './pasteFlow'

/**
 * The paste chooser (a small pop-up on a rich paste: Keep original format,
 * Plain text, As table) and the chip after a paste that swaps the result.
 * State lives in pasteFlow.ts; one instance per page editor shows only the
 * requests of its own editor.
 */
export function PasteChooser({ owner }: { owner: unknown }) {
  const ui = useSyncExternalStore(pasteUiSubscribe, pasteUiState)
  const chooser = ui.chooser?.owner === owner ? ui.chooser : null
  const chip = ui.chip?.owner === owner ? ui.chip : null
  // Ctrl/Cmd+C of whole blocks: clean Markdown and rich HTML go with them.
  useEffect(() => {
    let off = () => {}
    let gone = false
    void import('./copyFormats').then((m) => {
      if (!gone) off = m.installCopyFormats(owner as never)
    })
    return () => {
      gone = true
      off()
    }
  }, [owner])
  // The chip fades away on its own after a few seconds.
  useEffect(() => {
    if (!chip) return
    const id = window.setTimeout(closePasteUi, 8000)
    return () => window.clearTimeout(id)
  }, [chip])

  if (chooser)
    return createPortal(<ChooserBox chooser={chooser} />, document.body)

  if (chip) {
    return createPortal(
      <div
        data-chrome
        role="group"
        aria-label={t('pasteChooser.chip')}
        className="pointer-events-auto fixed bottom-4 start-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-full border border-line bg-bg px-2 py-1 text-[13px] shadow-lg"
      >
        <span className="px-2 text-ink-soft">{t('pasteChooser.chip')}</span>
        {chip.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={choice === chip.current}
            onClick={() => chip.swap(choice)}
            className="min-h-11 rounded-full px-3 hover:bg-hover aria-pressed:bg-hover aria-pressed:font-medium"
          >
            {t(labelKey(chip.plan, choice) as never)}
          </button>
        ))}
      </div>,
      document.body,
    )
  }
  return null
}

function ChooserBox({ chooser }: { chooser: ChooserRequest }) {
  const [index, setIndex] = useState(0)
  const [remember, setRemember] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { choices, plan } = chooser
  useEffect(() => box.current?.focus(), [])
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      chooser.cancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      chooser.pick(choices[index], remember)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setIndex((i) => (i + step + choices.length) % choices.length)
    }
  }
  return (
    <div
      data-chrome
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-3 sm:items-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) chooser.cancel()
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-label={t('pasteChooser.title')}
        tabIndex={-1}
        onKeyDown={onKey}
        className="w-full max-w-sm rounded-xl border border-line bg-bg p-3 shadow-xl outline-none"
      >
        <p className="mb-2 text-sm font-medium">{t('pasteChooser.title')}</p>
        <ul
          role="listbox"
          aria-label={t('pasteChooser.title')}
          className="grid gap-1.5"
        >
          {choices.map((choice, i) => (
            <li key={choice} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === index}
                onClick={() => chooser.pick(choice, remember)}
                onPointerMove={() => setIndex(i)}
                className="flex min-h-11 w-full flex-col items-start justify-center rounded-lg border border-line px-3 py-1 text-start hover:bg-hover aria-selected:border-accent aria-selected:bg-hover"
              >
                <span className="text-[14px] font-medium">
                  {t(labelKey(plan, choice) as never)}
                  {i === 0 && (
                    <span className="ms-2 text-[12px] font-normal text-ink-soft">
                      {t('pasteChooser.default')}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-[12px] text-ink-soft">
                  {previewOf(plan, choice)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4"
          />
          {t('pasteChooser.always')}
        </label>
        <p className="text-[12px] text-ink-soft">{t('pasteChooser.keys')}</p>
      </div>
    </div>
  )
}
