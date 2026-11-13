import { useEffect, useState } from 'react'
import { PHONE_SCREEN } from '../app/appUi'
import { OnOff } from '../design/parts/OnOff'
import { Card, CardTrigger } from '../design/parts/Card'
import { CardNote, SwitchRow, Tile, TileGroup } from '../design/parts/CardParts'
import { activeTool, type ModeTool } from '../app/tools/main/mainTools'
import {
  HIGHLIGHT_COLOURS,
  PEN_COLOURS,
  PEN_TYPES,
  type PenType,
  highlighterSettings,
  penSettings,
} from '../app/tools/main/inkSettings'
import { Icon } from '../app/tools/icons'
import { t } from '../i18n/t'
import { useUnlocked } from '../settings/level'
import type { InkBarMode } from './readStyle'

const TOOLS = [
  'pen',
  'highlighter',
  'eraser',
  'lasso',
] as const satisfies readonly ModeTool[]

const btn = (active: boolean, tight = false) =>
  `min-h-11 min-w-11 rounded-lg ${tight ? 'px-2' : 'px-3'} text-sm hover:bg-hover ${active ? 'bg-hover font-medium' : ''}`

/**
 * C2b: the small drawing strip of the book reader (shown while Pen is on):
 * Pen, Highlighter, Eraser, Lasso, a few colours, Undo, Redo and Done. The
 * tools and settings are the ones the notes use.
 */
export function ReaderInkBar({
  onDone,
  mode = 'simple',
  v2 = false,
  sticky,
}: {
  onDone: () => void
  mode?: InkBarMode
  /** Flag reader.v2: sits inside the floating glass bar, so no strip of its own. */
  v2?: boolean
  /** Reader v2: the Sticky note tool (arms the next tap on a page). */
  sticky?: { armed: boolean; onToggle: () => void }
}) {
  const tool = activeTool.useValue()
  const pen = penSettings.useValue()
  const hl = highlighterSettings.useValue()
  // Reader v2: Lasso waits behind its Professional switch (RD-P18).
  const inkTools = useUnlocked('reader.inkTools')
  // Reader v2: pen type, highlighter opacity and a custom colour wait behind reader.inkLook (RD-P19).
  const inkLookOn = useUnlocked('reader.inkLook')
  const inkLook = !v2 || inkLookOn
  // Gate 3, ninth visit (fix 6): on a phone the bar is 2 rows; sizes, pen
  // type, opacity and Finger draws fold behind one ▾.
  const compact = v2 && matchMedia(PHONE_SCREEN).matches
  const tools = v2 && !inkTools ? TOOLS.filter((x) => x !== 'lasso') : TOOLS
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
      className={
        v2
          ? `flex flex-wrap items-center ${compact ? '' : 'gap-1'} px-1.5 py-1`
          : 'flex flex-wrap items-center gap-1 border-b border-line bg-bg px-2 py-1'
      }
    >
      {tools.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={tool === id}
          data-testid={`reader-ink-${id}`}
          className={btn(tool === id, compact)}
          onClick={() => activeTool.set(id)}
        >
          {t(`main.tool.${id}`)}
        </button>
      ))}
      {sticky && (
        <button
          type="button"
          aria-pressed={sticky.armed}
          aria-label={t('readerv2.sticky.tool')}
          data-testid="reader-ink-sticky"
          className={btn(sticky.armed)}
          onClick={sticky.onToggle}
        >
          <Icon name="tape" size={18} />
        </button>
      )}
      {compact && (
        <>
          <span className="flex-1" />
          <button
            type="button"
            data-testid="reader-ink-done"
            className={btn(false, true)}
            onClick={onDone}
          >
            {t('reader.ink.done')}
          </button>
          <span className="basis-full" aria-hidden />
        </>
      )}
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
      {!compact &&
        mode !== 'simple' &&
        (tool === 'pen' || tool === 'highlighter') && (
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
      {!compact && mode === 'full' && inkLook && tool === 'pen' && (
        <PenTypeMenu
          value={pen.type}
          onChange={(p) => penSettings.update({ type: p })}
        />
      )}
      {!compact && mode === 'full' && inkLook && tool === 'highlighter' && (
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
      {!compact &&
        mode === 'full' &&
        inkLook &&
        (tool === 'pen' || tool === 'highlighter') && (
          <label
            data-testid="reader-ink-custom"
            className="relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-hover"
          >
            <span className="sr-only">{t('reader.ink.customColour')}</span>
            <span
              aria-hidden
              className="pcard-swatch border border-line"
              style={{
                background: /^#[0-9a-f]{6}$/i.test(current)
                  ? current
                  : 'var(--color-ink)',
              }}
            />
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(current) ? current : '#000000'}
              onChange={(e) =>
                tool === 'highlighter'
                  ? highlighterSettings.update({ colour: e.target.value })
                  : penSettings.update({ colour: e.target.value })
              }
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        )}
      {compact && <InkOptions tool={tool} mode={mode} inkLook={inkLook} />}
      {v2 && !compact && (
        <>
          <span className="flex min-h-11 items-center gap-2 px-2 text-sm">
            <span aria-hidden>{t('readerv2.finger.label')}</span>
            <OnOff
              checked={pen.finger === 'on'}
              label={t('readerv2.finger.label')}
              testId="reader-ink-finger"
              onChange={(on) =>
                penSettings.update({ finger: on ? 'on' : 'off' })
              }
            />
          </span>
          <span className="flex-1" />
        </>
      )}
      {!v2 && <span className="flex-1" />}
      {!compact && (
        <button
          type="button"
          data-testid="reader-ink-done"
          className={btn(false)}
          onClick={onDone}
        >
          {t('reader.ink.done')}
        </button>
      )}
      {v2 && !compact && (
        <p
          className="basis-full px-2 text-xs text-ink-soft"
          data-testid="reader-ink-finger-note"
        >
          {pen.finger === 'on'
            ? t('readerv2.finger.on')
            : t('readerv2.finger.off')}
        </p>
      )}
    </div>
  )
}

/** Pen type as the shared ▾ menu (gate 3 fix 4: no browser select). */
function PenTypeMenu({
  value,
  onChange,
}: {
  value: PenType
  onChange: (p: PenType) => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const label = t('reader.ink.type')
  return (
    <>
      <CardTrigger
        open={!!anchor}
        label={label}
        testId="reader-ink-type"
        onClick={(el) => setAnchor(anchor ? null : el)}
      >
        {t(`ink.pen.${value}` as 'ink.pen.ball')}
      </CardTrigger>
      {anchor && (
        <Card
          anchor={anchor}
          size="pick"
          title={label}
          autoClose
          onClose={() => setAnchor(null)}
        >
          <TileGroup label={label} columns={3}>
            {PEN_TYPES.map((p) => (
              <Tile
                key={p}
                label={t(`ink.pen.${p}` as 'ink.pen.ball')}
                selected={p === value}
                testId={`reader-ink-type-${p}`}
                onSelect={() => onChange(p)}
              />
            ))}
          </TileGroup>
        </Card>
      )}
    </>
  )
}

/**
 * Phone pen bar (gate 3, ninth visit, fix 6): one ▾ holds sizes, pen type,
 * highlighter opacity and Finger draws with its explanation.
 */
function InkOptions({
  tool,
  mode,
  inkLook,
}: {
  tool: ModeTool
  mode: InkBarMode
  inkLook: boolean
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const pen = penSettings.useValue()
  const hl = highlighterSettings.useValue()
  const label = t('readerv2.ink.options')
  const inking = tool === 'pen' || tool === 'highlighter'
  const size = tool === 'pen' ? pen.size : hl.size
  const current = tool === 'highlighter' ? hl.colour : pen.colour
  return (
    <>
      <CardTrigger
        open={!!anchor}
        label={label}
        testId="reader-ink-options"
        onClick={(el) => setAnchor(anchor ? null : el)}
      >
        {null}
      </CardTrigger>
      {anchor && (
        <Card
          anchor={anchor}
          size="pick"
          title={label}
          onClose={() => setAnchor(null)}
        >
          {mode !== 'simple' && inking && (
            <TileGroup label={t('reader.ink.size')} columns={3}>
              {([0, 1, 2] as const).map((n) => (
                <Tile
                  key={n}
                  label={t(`reader.ink.size.${n}` as 'reader.ink.size.0')}
                  selected={size === n}
                  testId={`reader-ink-size-${n}`}
                  onSelect={() =>
                    tool === 'pen'
                      ? penSettings.update({ size: n, exact: null })
                      : highlighterSettings.update({ size: n })
                  }
                />
              ))}
            </TileGroup>
          )}
          {mode === 'full' && inkLook && tool === 'pen' && (
            <TileGroup label={t('reader.ink.type')} columns={3}>
              {PEN_TYPES.map((p) => (
                <Tile
                  key={p}
                  label={t(`ink.pen.${p}` as 'ink.pen.ball')}
                  selected={p === pen.type}
                  testId={`reader-ink-type-${p}`}
                  onSelect={() => penSettings.update({ type: p })}
                />
              ))}
            </TileGroup>
          )}
          {mode === 'full' && inkLook && tool === 'highlighter' && (
            <label className="pcard-row">
              {t('reader.ink.opacity')}
              <input
                type="range"
                min={20}
                max={90}
                value={hl.opacity}
                data-testid="reader-ink-opacity"
                onChange={(e) =>
                  highlighterSettings.update({
                    opacity: Number(e.target.value),
                  })
                }
                className="min-h-11 w-28"
              />
            </label>
          )}
          {mode === 'full' && inkLook && inking && (
            <label
              data-testid="reader-ink-custom"
              className="pcard-row relative cursor-pointer"
            >
              {t('reader.ink.customColour')}
              <span
                aria-hidden
                className="pcard-swatch border border-line"
                style={{
                  background: /^#[0-9a-f]{6}$/i.test(current)
                    ? current
                    : 'var(--color-ink)',
                }}
              />
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(current) ? current : '#000000'}
                onChange={(e) =>
                  tool === 'highlighter'
                    ? highlighterSettings.update({ colour: e.target.value })
                    : penSettings.update({ colour: e.target.value })
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          )}
          <SwitchRow
            label={t('readerv2.finger.label')}
            checked={pen.finger === 'on'}
            onChange={(on) => penSettings.update({ finger: on ? 'on' : 'off' })}
          />
          <CardNote>
            {pen.finger === 'on'
              ? t('readerv2.finger.on')
              : t('readerv2.finger.off')}
          </CardNote>
        </Card>
      )}
    </>
  )
}
