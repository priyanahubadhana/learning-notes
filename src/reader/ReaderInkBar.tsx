import { useEffect } from 'react'
import { activeTool, type ModeTool } from '../app/tools/main/mainTools'
import {
  HIGHLIGHT_COLOURS,
  PEN_COLOURS,
  highlighterSettings,
  penSettings,
} from '../app/tools/main/inkSettings'
import { useInk } from '../ink/inkRuntime'
import { t } from '../i18n/t'

const TOOLS = [
  'pen',
  'highlighter',
  'eraser',
  'lasso',
] as const satisfies readonly ModeTool[]

const btn = (active: boolean) =>
  `min-h-11 min-w-11 rounded-lg px-3 text-sm hover:bg-hover ${active ? 'bg-hover font-medium' : ''}`

/**
 * C2b: the small drawing strip of the book reader (shown while Pen is on):
 * Pen, Highlighter, Eraser, Lasso, a few colours, Undo, Redo and Done. The
 * tools and settings are the ones the notes use.
 */
export function ReaderInkBar({ onDone }: { onDone: () => void }) {
  const tool = activeTool.useValue()
  const pen = penSettings.useValue()
  const hl = highlighterSettings.useValue()
  const api = useInk()
  // Drawing starts with the Pen.
  useEffect(() => {
    if (!TOOLS.includes(activeTool.get() as (typeof TOOLS)[number])) {
      activeTool.set('pen')
    }
  }, [])
  const colours =
    tool === 'highlighter'
      ? HIGHLIGHT_COLOURS
      : tool === 'pen'
        ? PEN_COLOURS
        : []
  const current = tool === 'highlighter' ? hl.colour : pen.colour
  return (
    <div
      data-chrome
      role="toolbar"
      aria-label={t('reader.ink.tools')}
      data-testid="reader-ink-bar"
      className="flex flex-wrap items-center gap-1 border-b border-line bg-bg px-2 py-1"
    >
      {TOOLS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={tool === id}
          data-testid={`reader-ink-${id}`}
          className={btn(tool === id)}
          onClick={() => activeTool.set(id)}
        >
          {t(`main.tool.${id}`)}
        </button>
      ))}
      {colours.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-label={t(`ink.colour.${c.id}` as 'ink.colour.black')}
          aria-pressed={current.toLowerCase() === c.hex.toLowerCase()}
          data-testid={`reader-ink-colour-${c.id}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-hover"
          onClick={() =>
            tool === 'highlighter'
              ? highlighterSettings.update({ colour: c.hex })
              : penSettings.update({ colour: c.hex })
          }
        >
          <span
            aria-hidden
            className="block size-5 rounded-full border border-line"
            style={{
              background: c.hex,
              outline:
                current.toLowerCase() === c.hex.toLowerCase()
                  ? '2px solid currentColor'
                  : undefined,
              outlineOffset: 2,
            }}
          />
        </button>
      ))}
      <span className="flex-1" />
      <button
        type="button"
        data-testid="reader-ink-undo"
        className={btn(false)}
        onClick={() => api?.controller.undo()}
      >
        {t('reader.ink.undo')}
      </button>
      <button
        type="button"
        data-testid="reader-ink-redo"
        className={btn(false)}
        onClick={() => api?.controller.redo()}
      >
        {t('reader.ink.redo')}
      </button>
      <button
        type="button"
        data-testid="reader-ink-done"
        className={btn(false)}
        onClick={onDone}
      >
        {t('reader.ink.done')}
      </button>
    </div>
  )
}
