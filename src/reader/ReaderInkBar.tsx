import { useEffect } from 'react'
import { activeTool, type ModeTool } from '../app/tools/main/mainTools'
import {
  HIGHLIGHT_COLOURS,
  PEN_COLOURS,
  PEN_TYPES,
  type PenType,
  highlighterSettings,
  penSettings,
} from '../app/tools/main/inkSettings'
import { t } from '../i18n/t'
import type { InkBarMode } from './readStyle'

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
export function ReaderInkBar({
  onDone,
  mode = 'simple',
}: {
  onDone: () => void
  mode?: InkBarMode
}) {
  const tool = activeTool.useValue()
  const pen = penSettings.useValue()
  const hl = highlighterSettings.useValue()
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
      {mode !== 'simple' && (tool === 'pen' || tool === 'highlighter') && (
        <span
          role="group"
          aria-label={t('reader.ink.size')}
          className="flex items-center"
        >
          {([0, 1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`reader-ink-size-${n}`}
              aria-pressed={(tool === 'pen' ? pen.size : hl.size) === n}
              aria-label={t(`reader.ink.size.${n}` as 'reader.ink.size.0')}
              className={btn((tool === 'pen' ? pen.size : hl.size) === n)}
              onClick={() =>
                tool === 'pen'
                  ? penSettings.update({ size: n, exact: null })
                  : highlighterSettings.update({ size: n })
              }
            >
              <span
                aria-hidden
                className="mx-auto block rounded-full bg-current"
                style={{ width: 6 + n * 4, height: 6 + n * 4 }}
              />
            </button>
          ))}
        </span>
      )}
      {mode === 'full' && tool === 'pen' && (
        <select
          data-testid="reader-ink-type"
          aria-label={t('reader.ink.type')}
          value={pen.type}
          onChange={(e) =>
            penSettings.update({ type: e.target.value as PenType })
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
        >
          {PEN_TYPES.map((p) => (
            <option key={p} value={p}>
              {t(`ink.pen.${p}` as 'ink.pen.ball')}
            </option>
          ))}
        </select>
      )}
      {mode === 'full' && tool === 'highlighter' && (
        <label className="flex items-center gap-1 text-sm">
          {t('reader.ink.opacity')}
          <input
            type="range"
            min={20}
            max={90}
            value={hl.opacity}
            data-testid="reader-ink-opacity"
            onChange={(e) =>
              highlighterSettings.update({ opacity: Number(e.target.value) })
            }
            className="min-h-11 w-24"
          />
        </label>
      )}
      {mode === 'full' && (tool === 'pen' || tool === 'highlighter') && (
        <label className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-hover">
          <span className="sr-only">{t('reader.ink.customColour')}</span>
          <input
            type="color"
            data-testid="reader-ink-custom"
            value={/^#[0-9a-f]{6}$/i.test(current) ? current : '#000000'}
            onChange={(e) =>
              tool === 'highlighter'
                ? highlighterSettings.update({ colour: e.target.value })
                : penSettings.update({ colour: e.target.value })
            }
            className="size-7 cursor-pointer rounded border border-line bg-transparent p-0"
          />
        </label>
      )}
      <span className="flex-1" />
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
