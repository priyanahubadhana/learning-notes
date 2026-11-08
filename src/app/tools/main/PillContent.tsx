import { useActiveStyles } from '../../../editor/useActiveStyles'
import { t, type MessageKey } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import {
  BACKGROUND_HEX,
  TEXT_HEX,
  colorLabel,
  setColor,
} from '../../../editor/colorData'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { currentRunner } from '../toolRuntime'
import { comingText, findTool, runTool } from '../toolRegistry'
import { useEditorRedraw } from './useEditorRedraw'
import { PEN_ICON, highlightChoice, textColourChoice } from './pillChoices'
import {
  ERASER_MODES,
  ERASER_SIZES,
  HIGHLIGHT_WIDTHS,
  PEN_WIDTHS,
  eraserSettings,
  highlighterSettings,
  lassoSettings,
  penSettings,
} from './inkSettings'
import { openCard, pillOptionsOf, pillLists, type PillTool } from './mainTools'
import { Caret, PillButton, Swatch, ThicknessChip } from './pillParts'
import { paletteFor, useCustomColours } from './pillKit'
import { activeLayerOf } from '../../../ink/layers'
import { useInk } from '../../../ink/inkRuntime'
import { alignOf, listOf, styleOf } from './textOps'

/** The options of each tool's pill. Each option is a button with a name. */

const opt = (tool: PillTool, id: string) =>
  t(`main.opt.${tool}.${id}` as MessageKey)

/** Opens a card page, or closes it when that page is already open. */
const goCard = (tool: PillTool, page: string) => {
  const now = openCard.get()
  openCard.set(now?.tool === tool && now.page === page ? null : { tool, page })
}

interface CardApi {
  open: (page: string) => void
  cardIs: (page: string) => boolean
}

export function PillContent({
  tool,
  editor,
}: {
  tool: PillTool
  editor: Editor | null
}) {
  const map = pillLists.useValue()
  const ids = pillOptionsOf(tool, map)
  const card = openCard.useValue()
  const api: CardApi = {
    open: (page) => goCard(tool, page),
    cardIs: (page) => card?.tool === tool && card.page === page,
  }
  switch (tool) {
    case 'text':
      return editor ? <TextOptions ids={ids} editor={editor} {...api} /> : null
    case 'pen':
      return <PenOptions ids={ids} {...api} />
    case 'highlighter':
      return <HighlighterOptions ids={ids} {...api} />
    case 'eraser':
      return <EraserOptions ids={ids} {...api} />
    case 'lasso':
      return <LassoOptions ids={ids} {...api} />
    case 'insert':
      return <InsertOptions ids={ids} />
  }
}

// ---- Aa ----

const STYLE_NAME: Record<string, MessageKey> = {
  title: 'main.style.title',
  h1: 'main.style.h1',
  h2: 'main.style.h2',
  h3: 'main.style.h3',
  body: 'main.style.body',
  other: 'main.style.other',
}

function TextOptions({
  ids,
  editor,
  open,
  cardIs,
}: { ids: string[]; editor: Editor } & CardApi) {
  useEditorRedraw(editor)
  const styles = useActiveStyles(editor)
  const block = editor.getTextCursorPosition().block as unknown as {
    type: string
    props: Record<string, unknown>
  }
  const run = (id: string) => {
    const r = currentRunner()
    runEditorCommand(id, { editor, extras: r.extras, app: r.app })
  }
  const text = textColourChoice.useValue()
  const mark = highlightChoice.useValue()
  const hasSelection = editor.getSelectedText().length > 0
  return (
    <>
      {ids.map((id) => {
        switch (id) {
          case 'style': {
            const name = t(STYLE_NAME[styleOf(block)])
            return (
              <PillButton
                key={id}
                id={id}
                label={`${opt('text', id)}: ${name}`}
                expanded={cardIs('style')}
                onClick={() => open('style')}
                className="min-w-24 px-2.5"
              >
                <span className="flex items-center gap-1 text-sm text-ink">
                  {name}
                  <Icon name="chevronDown" size={14} />
                </span>
              </PillButton>
            )
          }
          case 'bold':
          case 'italic':
          case 'underline':
            return (
              <PillButton
                key={id}
                id={id}
                label={opt('text', id)}
                icon={id}
                pressed={!!styles[id]}
                onClick={() => run(id)}
              />
            )
          case 'textColor':
            return (
              <span key={id} className="inline-flex shrink-0 items-center">
                <PillButton
                  id={id}
                  label={`${opt('text', id)}: ${colorLabel(text)}`}
                  pressed={styles.textColor === text}
                  onClick={() =>
                    setColor(
                      editor,
                      'textColor',
                      styles.textColor === text ? 'default' : text,
                    )
                  }
                >
                  <span className="flex flex-col items-center leading-none font-bold text-ink">
                    A
                    <span
                      className="mt-0.5 h-1 w-4 rounded-full border border-ink-soft"
                      style={{ backgroundColor: TEXT_HEX[text] }}
                    />
                  </span>
                </PillButton>
                <Caret
                  id={id}
                  label={opt('text', 'textColorCard')}
                  open={cardIs('textColor')}
                  onClick={() => open('textColor')}
                />
              </span>
            )
          case 'highlightColor':
            return (
              <span key={id} className="inline-flex shrink-0 items-center">
                <PillButton
                  id={id}
                  label={`${opt('text', id)}: ${colorLabel(mark)}`}
                  pressed={styles.backgroundColor === mark}
                  onClick={() =>
                    setColor(
                      editor,
                      'backgroundColor',
                      styles.backgroundColor === mark ? 'default' : mark,
                    )
                  }
                >
                  <span
                    className="grid size-7 place-items-center rounded-md border-2 border-ink text-[#1d1d1f]"
                    style={{ backgroundColor: BACKGROUND_HEX[mark] }}
                  >
                    <Icon name="highlighter" size={16} />
                  </span>
                </PillButton>
                <Caret
                  id={id}
                  label={opt('text', 'highlightColorCard')}
                  open={cardIs('highlightColor')}
                  onClick={() => open('highlightColor')}
                />
              </span>
            )
          case 'list': {
            const kind = listOf(block.type)
            return (
              <span key={id} className="inline-flex shrink-0 items-center">
                <PillButton
                  id={id}
                  label={opt('text', id)}
                  icon={
                    kind === 'numbers'
                      ? 'numbered'
                      : kind === 'checklist'
                        ? 'checklist'
                        : 'list'
                  }
                  pressed={kind !== null}
                  expanded={cardIs('list')}
                  onClick={() => open('list')}
                />
                <Caret
                  id={id}
                  label={opt('text', id)}
                  open={cardIs('list')}
                  onClick={() => open('list')}
                />
              </span>
            )
          }
          case 'align': {
            const a = alignOf(block)
            return (
              <span key={id} className="inline-flex shrink-0 items-center">
                <PillButton
                  id={id}
                  label={opt('text', id)}
                  icon={
                    a === 'center'
                      ? 'alignCenter'
                      : a === 'right'
                        ? 'alignRight'
                        : a === 'justify'
                          ? 'alignJustify'
                          : 'alignLeft'
                  }
                  expanded={cardIs('align')}
                  onClick={() => open('align')}
                />
                <Caret
                  id={id}
                  label={opt('text', id)}
                  open={cardIs('align')}
                  onClick={() => open('align')}
                />
              </span>
            )
          }
          case 'keyPoint':
            return (
              <PillButton
                key={id}
                id={id}
                label={opt('text', id)}
                icon="star"
                pressed={styles.mark === 'key'}
                disabled={!hasSelection && styles.mark !== 'key'}
                onClick={() => run('mark:key')}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}

// ---- Pen ----

/** "Layer 1 ▾": the layer the ink tools draw on; opens the Layers card. */
function LayerChip({ open, cardIs }: Pick<CardApi, 'open' | 'cardIs'>) {
  const ink = useInk()
  const active = ink ? activeLayerOf(ink.doc.layers, ink.doc.chosenLayer) : null
  const name = active?.name ?? t('ink.layer.default', { n: 1 })
  return (
    <PillButton
      id="layer"
      label={name}
      expanded={cardIs('layers')}
      onClick={() => open('layers')}
      className="!w-auto gap-1 px-3 text-sm"
    >
      <span data-layer-chip>{name} ▾</span>
    </PillButton>
  )
}

function PenOptions({ ids, open, cardIs }: { ids: string[] } & CardApi) {
  const pen = penSettings.useValue()
  const custom = useCustomColours()
  return (
    <>
      <LayerChip open={open} cardIs={cardIs} />
      {ids.map((id) => {
        if (id === 'type') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              <PillButton
                id={id}
                label={`${opt('pen', id)}: ${t(`ink.pen.${pen.type}` as MessageKey)}`}
                icon={PEN_ICON[pen.type]}
                expanded={cardIs('main')}
                onClick={() => open('main')}
              />
              <Caret
                id={id}
                label={opt('pen', id)}
                open={cardIs('main')}
                onClick={() => open('main')}
              />
            </span>
          )
        }
        if (id === 'thickness') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {([0, 1, 2] as const).map((i) => (
                <ThicknessChip
                  key={i}
                  id={`thickness${i + 1}`}
                  label={t(`ink.thickness.${i + 1}` as MessageKey)}
                  px={PEN_WIDTHS[pen.type][i]}
                  on={pen.exact === null && pen.size === i}
                  onClick={() => {
                    if (pen.exact === null && pen.size === i) open('stroke')
                    else penSettings.update({ size: i, exact: null })
                  }}
                />
              ))}
            </span>
          )
        }
        if (id === 'colour') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {paletteFor('pen', custom).map((c) => (
                <Swatch
                  key={c.id}
                  id={`colour-${c.id}`}
                  hex={c.hex}
                  name={c.name}
                  on={pen.colour === c.hex}
                  onClick={() => {
                    if (pen.colour === c.hex) open('colour')
                    else penSettings.update({ colour: c.hex })
                  }}
                />
              ))}
              <PillButton
                id="colourAdd"
                label={t('ink.colour.add')}
                icon="plus"
                expanded={cardIs('colour')}
                onClick={() => open('colour')}
              />
            </span>
          )
        }
        return null
      })}
    </>
  )
}

// ---- Highlighter ----

function HighlighterOptions({
  ids,
  open,
  cardIs,
}: { ids: string[] } & CardApi) {
  const h = highlighterSettings.useValue()
  const custom = useCustomColours()
  return (
    <>
      <LayerChip open={open} cardIs={cardIs} />
      {ids.map((id) => {
        if (id === 'thickness') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {([0, 1, 2] as const).map((i) => (
                <ThicknessChip
                  key={i}
                  id={`thickness${i + 1}`}
                  label={t(`ink.thickness.${i + 1}` as MessageKey)}
                  px={HIGHLIGHT_WIDTHS[i] / 2}
                  on={h.size === i}
                  onClick={() => {
                    if (h.size === i) open('main')
                    else highlighterSettings.update({ size: i })
                  }}
                />
              ))}
            </span>
          )
        }
        if (id === 'colour') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {paletteFor('highlighter', custom).map((c) => (
                <Swatch
                  key={c.id}
                  id={`colour-${c.id}`}
                  hex={c.hex}
                  name={c.name}
                  on={h.colour === c.hex}
                  onClick={() => {
                    if (h.colour === c.hex) open('colour')
                    else highlighterSettings.update({ colour: c.hex })
                  }}
                />
              ))}
              <PillButton
                id="colourAdd"
                label={t('ink.colour.add')}
                icon="plus"
                expanded={cardIs('colour')}
                onClick={() => open('colour')}
              />
              <Caret
                id="card"
                label={opt('highlighter', 'card')}
                open={cardIs('main')}
                onClick={() => open('main')}
              />
            </span>
          )
        }
        return null
      })}
    </>
  )
}

// ---- Eraser ----

const ERASER_ICON: Record<string, IconName> = {
  precise: 'crosshair',
  standard: 'eraser',
  stroke: 'penLine',
}

function EraserOptions({ ids, open, cardIs }: { ids: string[] } & CardApi) {
  const e = eraserSettings.useValue()
  return (
    <>
      <LayerChip open={open} cardIs={cardIs} />
      {ids.map((id) => {
        if (id === 'mode') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {ERASER_MODES.map((mode) => (
                <PillButton
                  key={mode}
                  id={`mode-${mode}`}
                  label={t(`ink.eraser.${mode}` as MessageKey)}
                  icon={ERASER_ICON[mode]}
                  pressed={e.mode === mode}
                  onClick={() => {
                    if (e.mode === mode) open('main')
                    else eraserSettings.update({ mode })
                  }}
                />
              ))}
            </span>
          )
        }
        if (id === 'size') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {([0, 1, 2] as const).map((i) => (
                <ThicknessChip
                  key={i}
                  id={`size${i + 1}`}
                  label={t(`ink.thickness.${i + 1}` as MessageKey)}
                  px={ERASER_SIZES[i] / 3}
                  on={e.size === i}
                  onClick={() => {
                    if (e.size === i) open('main')
                    else eraserSettings.update({ size: i })
                  }}
                />
              ))}
            </span>
          )
        }
        if (id === 'highlightsOnly') {
          return (
            <PillButton
              key={id}
              id={id}
              label={t('ink.eraser.highlightsOnly')}
              icon="highlighter"
              pressed={e.highlightsOnly}
              onClick={() =>
                eraserSettings.update({ highlightsOnly: !e.highlightsOnly })
              }
            />
          )
        }
        return null
      })}
    </>
  )
}

// ---- Lasso ----

function LassoOptions({ ids, open }: { ids: string[] } & CardApi) {
  const l = lassoSettings.useValue()
  return (
    <>
      {ids.map((id) => {
        if (id === 'shape') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {(['free', 'rect'] as const).map((shape) => (
                <PillButton
                  key={shape}
                  id={`shape-${shape}`}
                  label={t(`ink.lasso.${shape}` as MessageKey)}
                  icon={shape === 'free' ? 'lasso' : 'square'}
                  pressed={l.shape === shape}
                  onClick={() => {
                    if (l.shape === shape) open('main')
                    else lassoSettings.update({ shape })
                  }}
                />
              ))}
            </span>
          )
        }
        if (id === 'filter') {
          return (
            <span key={id} className="inline-flex shrink-0 items-center">
              {(
                [
                  ['ink', 'pen'],
                  ['pictures', 'image'],
                  ['text', 'type'],
                ] as const
              ).map(([key, icon]) => (
                <PillButton
                  key={key}
                  id={`filter-${key}`}
                  label={t(`ink.lasso.filter.${key}` as MessageKey)}
                  icon={icon}
                  pressed={l[key]}
                  onClick={() => lassoSettings.update({ [key]: !l[key] })}
                />
              ))}
            </span>
          )
        }
        return null
      })}
    </>
  )
}

// ---- Insert ----

const INSERT_ICON: Record<string, IconName> = {
  table: 'table',
  shape: 'shapes',
  picture: 'image',
  camera: 'camera',
  file: 'filePlus',
  callout: 'sparkles',
  audio: 'music',
  card: 'cards',
  tape: 'tape',
  magnifier: 'zoom',
  ruler: 'ruler',
  writePad: 'pencil',
  handwriting: 'penLine',
}
/** The registry tool each Insert option runs (when the names differ). */
const INSERT_TOOL: Record<string, string> = { shape: 'shapes' }

const comingOf = (id: string) => {
  const reason = findTool(id)?.coming
  return reason ? comingText(reason) : undefined
}

function InsertOptions({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => {
        const toolId = INSERT_TOOL[id] ?? id
        return (
          <PillButton
            key={id}
            id={id}
            label={opt('insert', id)}
            icon={INSERT_ICON[id]}
            coming={!!findTool(toolId)?.coming}
            hint={comingOf(toolId)}
            onClick={() => runTool(toolId)}
          />
        )
      })}
    </>
  )
}
