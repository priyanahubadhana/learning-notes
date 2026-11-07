import { useActiveStyles } from '../../../editor/useActiveStyles'
import { useState } from 'react'
import { t, type MessageKey } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import {
  BACKGROUND_HEX,
  COLOR_NAMES,
  TEXT_HEX,
  colorLabel,
  setColor,
} from '../../../editor/colorData'
import {
  readingBlanksSetting,
  readingFlowSetting,
  readingFontSetting,
  readingMarginSetting,
  readingRulerSetting,
  readingSizeSetting,
  readingSpacingSetting,
  readingThemeSetting,
  readingWidthSetting,
} from '../../../settings/readingSettings'
import type { SettingDefinition } from '../../../settings/registry'
import { useDeviceSetting } from '../../../settings/useSetting'
import { Tip } from '../../../help/Help'
import { Icon } from '../icons'
import { FontTiles } from '../../reading/FontTiles'
import { currentRunner } from '../toolRuntime'
import { runEditorCommand } from '../editorCommands'
import { runTool } from '../toolRegistry'
import {
  ActionRow,
  CardHeader,
  CardLabel,
  ChipRow,
  NavRow,
  SliderRow,
  SwitchRow,
} from './cardParts'
import { keepFocus } from './pillKit'
import { highlightChoice, PEN_ICON, textColourChoice } from './pillChoices'
import { parentPage } from './cardPages'
import {
  ERASER_MODES,
  FINGER_MODES,
  HIGHLIGHT_COLOURS,
  LINE_STYLES,
  PEN_COLOURS,
  PEN_TYPES,
  DRAW_AS,
  addCustomColour,
  eraserSettings,
  highlighterSettings,
  isHex,
  lassoSettings,
  penSettings,
  penWidth,
} from './inkSettings'
import { InkPreview } from './InkPreview'
import { LayersCard } from '../../../ink/LayersCard'
import { useInk } from '../../../ink/inkRuntime'
import type { CardState } from './mainTools'
import {
  lassoRow,
  ROW_ACTIONS,
  setRowAction,
  type RowAction,
} from '../../../ink/lassoMenu'
import { selectTool } from './selectTool'
import { useEditorRedraw } from './useEditorRedraw'
import {
  ALIGNS,
  alignOf,
  listOf,
  setAlign,
  setList,
  setStyle,
  styleOf,
  TEXT_STYLES,
  type ListKind,
} from './textOps'
import {
  NOTE_LINES,
  NOTE_SIZES,
  applyNoteStyle,
  noteFont,
  noteLine,
  noteSize,
} from './textStyle'

/**
 * The detail card: opens when the active option is tapped again (or its ▾).
 * Rows with "›" open a sub-page; ‹ goes back. Every card has a ✕.
 */

const msg = (key: string) => t(key as MessageKey)

export function DetailCard({
  card,
  editor,
  onPage,
  onClose,
}: {
  card: CardState
  editor: Editor | null
  onPage: (page: string) => void
  onClose: () => void
}) {
  const back = parentPage(card.tool, card.page)
  const title = msg(`main.card.${card.tool}.${card.page}`)
  return (
    <div
      role="group"
      aria-label={title}
      data-card={`${card.tool}.${card.page}`}
      className="grid gap-0.5"
    >
      <CardHeader
        title={title}
        onBack={back ? () => onPage(back) : undefined}
        onClose={onClose}
      />
      <CardBody card={card} editor={editor} onPage={onPage} />
    </div>
  )
}

function CardBody({
  card,
  editor,
  onPage,
}: {
  card: CardState
  editor: Editor | null
  onPage: (page: string) => void
}) {
  const key = `${card.tool}.${card.page}`
  switch (key) {
    case 'text.style':
      return editor && <StyleCard editor={editor} onPage={onPage} />
    case 'text.font':
      return <FontPage />
    case 'text.boxStyle':
      return editor && <BoxStylePage editor={editor} />
    case 'text.list':
      return editor && <ListPage editor={editor} />
    case 'text.align':
      return editor && <AlignPage editor={editor} />
    case 'text.textColor':
      return editor && <ColourNames editor={editor} kind="textColor" />
    case 'text.highlightColor':
      return editor && <ColourNames editor={editor} kind="backgroundColor" />
    case 'pen.main':
      return <PenCard onPage={onPage} />
    case 'pen.colour':
      return <ColourPage tool="pen" />
    case 'pen.settings':
      return <PenSettingsPage />
    case 'pen.gestures':
      return <PenGesturesPage />
    case 'pen.stroke':
      return <StrokePage />
    case 'pen.layers':
    case 'highlighter.layers':
    case 'lasso.layers':
    case 'eraser.layers':
      return <LayersCard />
    case 'highlighter.main':
      return <HighlighterCard onPage={onPage} />
    case 'highlighter.colour':
      return <ColourPage tool="highlighter" />
    case 'eraser.main':
      return <EraserCard />
    case 'lasso.main':
      return <LassoCard onPage={onPage} />
    case 'read.aa':
      return <AaCard />
    default:
      return null
  }
}

// ---- Aa › Style ----

function StyleCard({
  editor,
  onPage,
}: {
  editor: Editor
  onPage: (page: string) => void
}) {
  useEditorRedraw(editor)
  const styles = useActiveStyles(editor)
  const block = editor.getTextCursorPosition().block as unknown as {
    type: string
    props: Record<string, unknown>
  }
  const current = styleOf(block)
  const font = noteFont.useValue()
  const size = noteSize.useValue()
  const line = noteLine.useValue()
  const run = (id: string) => {
    const r = currentRunner()
    runEditorCommand(id, { editor, extras: r.extras, app: r.app })
  }
  return (
    <>
      <ChipRow
        id="style"
        label={t('main.opt.text.style')}
        value={current === 'other' ? 'body' : current}
        columns={5}
        options={TEXT_STYLES.map((s) => ({
          value: s,
          label: msg(`main.style.${s}`),
        }))}
        onChange={(s) => setStyle(editor, s)}
      />
      <NavRow
        id="font"
        label={t('main.card.text.font')}
        hint={msg(`main.font.${font}`)}
        onClick={() => onPage('font')}
      />
      <CardLabel>{t('main.text.size')}</CardLabel>
      <ChipRow
        id="size"
        label={t('main.text.size')}
        value={size}
        columns={5}
        options={NOTE_SIZES.map((s) => ({ value: s, label: `${s}%` }))}
        onChange={(s) => {
          noteSize.set(s)
          applyNoteStyle()
        }}
      />
      <CardLabel>{t('main.text.lineHeight')}</CardLabel>
      <ChipRow
        id="line"
        label={t('main.text.lineHeight')}
        value={line}
        options={NOTE_LINES.map((l) => ({
          value: l,
          label: msg(`main.line.${l}`),
        }))}
        onChange={(l) => {
          noteLine.set(l)
          applyNoteStyle()
        }}
      />
      <NavRow
        id="boxStyle"
        label={t('main.card.text.boxStyle')}
        onClick={() => onPage('boxStyle')}
      />
      <hr className="my-0.5 border-line" />
      <SwitchRow
        id="strike"
        label={t('main.text.strike')}
        on={!!styles.strike}
        onChange={() => run('strike')}
      />
      <SwitchRow
        id="code"
        label={t('main.text.code')}
        on={!!styles.code}
        onChange={() => run('code')}
      />
      <ActionRow
        id="link"
        icon="link"
        label={t('main.text.link')}
        onClick={() => run('link')}
      />
    </>
  )
}

function FontPage() {
  const font = noteFont.useValue()
  return (
    <FontTiles
      value={font}
      none="default"
      onPick={(f) => {
        noteFont.set(f)
        applyNoteStyle()
      }}
    />
  )
}

const BOX_STYLES = ['plain', 'quote', 'callout', 'code'] as const
const BOX_TYPE = {
  plain: 'paragraph',
  quote: 'quote',
  callout: 'callout',
  code: 'codeBlock',
} as const

function BoxStylePage({ editor }: { editor: Editor }) {
  useEditorRedraw(editor)
  const type = editor.getTextCursorPosition().block.type
  const current =
    BOX_STYLES.find((s) => BOX_TYPE[s] === type) ?? ('plain' as const)
  return (
    <ChipRow
      id="boxStyle"
      label={t('main.card.text.boxStyle')}
      value={current}
      columns={2}
      options={BOX_STYLES.map((s) => ({
        value: s,
        label: msg(`main.box.${s}`),
      }))}
      onChange={(s) => {
        const blocks = editor.getSelection()?.blocks ?? [
          editor.getTextCursorPosition().block,
        ]
        for (const b of blocks) {
          editor.updateBlock(b, { type: BOX_TYPE[s] } as never)
        }
        editor.focus()
      }}
    />
  )
}

function ListPage({ editor }: { editor: Editor }) {
  useEditorRedraw(editor)
  const kind = listOf(editor.getTextCursorPosition().block.type)
  const kinds: Exclude<ListKind, 'toggle'>[] = [
    'bullets',
    'numbers',
    'checklist',
  ]
  return (
    <>
      <ChipRow
        id="list"
        label={t('main.opt.text.list')}
        value={(kind ?? 'none') as string}
        columns={3}
        options={kinds.map((k) => ({
          value: k as string,
          label: msg(`main.list.${k}`),
          icon:
            k === 'bullets'
              ? 'list'
              : k === 'numbers'
                ? 'numbered'
                : 'checklist',
        }))}
        onChange={(k) => setList(editor, k as Exclude<ListKind, 'toggle'>)}
      />
      <ActionRow
        id="toggle"
        icon="toggle"
        label={t('main.list.toggle')}
        note={t('main.coming.later')}
        disabled
        onClick={() => currentRunner().app?.toast(t('main.coming.later'))}
      />
    </>
  )
}

function AlignPage({ editor }: { editor: Editor }) {
  useEditorRedraw(editor)
  const a = alignOf(
    editor.getTextCursorPosition().block as unknown as {
      props: Record<string, unknown>
    },
  )
  return (
    <ChipRow
      id="align"
      label={t('main.opt.text.align')}
      value={a}
      columns={4}
      options={ALIGNS.map((x) => ({
        value: x,
        label: msg(`main.align.${x}`),
        icon:
          x === 'left'
            ? 'alignLeft'
            : x === 'center'
              ? 'alignCenter'
              : x === 'right'
                ? 'alignRight'
                : 'alignJustify',
      }))}
      onChange={(x) => setAlign(editor, x)}
    />
  )
}

/** Every colour by name (text or highlight); picking one applies it. */
function ColourNames({
  editor,
  kind,
}: {
  editor: Editor
  kind: 'textColor' | 'backgroundColor'
}) {
  const styles = useActiveStyles(editor)
  const now =
    typeof styles[kind] === 'string' ? (styles[kind] as string) : 'default'
  const hex = kind === 'textColor' ? TEXT_HEX : BACKGROUND_HEX
  return (
    <div className="grid grid-cols-2 gap-1 px-1" data-card-colours={kind}>
      {COLOR_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          data-colour-name={name}
          aria-pressed={now === name}
          onMouseDown={keepFocus}
          onClick={() => {
            if (name !== 'default') {
              if (kind === 'textColor') textColourChoice.set(name)
              else highlightChoice.set(name)
            }
            setColor(editor, kind, name)
          }}
          className={`flex min-h-11 items-center gap-2 rounded-lg border px-2 text-sm ${
            now === name
              ? 'border-accent bg-hover font-semibold'
              : 'border-line'
          }`}
        >
          <span
            aria-hidden
            className="size-5 shrink-0 rounded-full border border-ink-soft"
            style={{ backgroundColor: hex[name] ?? 'transparent' }}
          />
          {colorLabel(name)}
          {now === name && <Icon name="check" size={16} className="ms-auto" />}
        </button>
      ))}
    </div>
  )
}

// ---- Pen ----

function PenCard({ onPage }: { onPage: (page: string) => void }) {
  const pen = penSettings.useValue()
  return (
    <>
      <InkPreview kind="pen" />
      <ChipRow
        id="penType"
        label={t('main.opt.pen.type')}
        value={pen.type}
        columns={5}
        options={PEN_TYPES.map((type) => ({
          value: type,
          label: msg(`ink.pen.${type}`),
          icon: PEN_ICON[type],
        }))}
        onChange={(type) => penSettings.update({ type })}
      />
      <ChipRow
        id="drawAs"
        label={t('ink.drawAs')}
        value={pen.drawAs}
        columns={4}
        options={DRAW_AS.map((drawAs) => ({
          value: drawAs,
          label: msg(`ink.drawAs.${drawAs}`),
        }))}
        onChange={(drawAs) => penSettings.update({ drawAs })}
      />
      <SliderRow
        id="sharpness"
        label={t('ink.pen.sharpness')}
        value={pen.sharpness}
        min={0}
        max={100}
        onChange={(sharpness) => penSettings.update({ sharpness })}
      />
      <SliderRow
        id="pressure"
        label={t('ink.pen.pressure')}
        value={pen.pressure}
        min={0}
        max={100}
        onChange={(pressure) => penSettings.update({ pressure })}
      />
      <SliderRow
        id="stabilisation"
        label={t('ink.pen.stabilisation')}
        value={pen.stabilisation}
        min={0}
        max={100}
        onChange={(stabilisation) => penSettings.update({ stabilisation })}
      />
      {pen.type === 'fountain' && (
        <SliderRow
          id="flatness"
          label={t('ink.pen.flatness')}
          value={pen.flatness}
          min={0}
          max={100}
          onChange={(flatness) => penSettings.update({ flatness })}
        />
      )}
      <NavRow
        id="settings"
        label={t('main.card.pen.settings')}
        onClick={() => onPage('settings')}
      />
      <NavRow
        id="gestures"
        label={t('main.card.pen.gestures')}
        onClick={() => onPage('gestures')}
      />
      <NavRow
        id="stroke"
        label={t('main.card.pen.stroke')}
        hint={`${Math.round(penWidth(pen) * 10) / 10} px`}
        onClick={() => onPage('stroke')}
      />
      <LayersRow onPage={onPage} />
    </>
  )
}

function PenSettingsPage() {
  const pen = penSettings.useValue()
  return (
    <>
      <SwitchRow
        id="tilt"
        label={t('ink.pen.tilt')}
        on={pen.tilt}
        onChange={(tilt) => penSettings.update({ tilt })}
      />
      <SwitchRow
        id="speedWidth"
        label={t('ink.pen.speedWidth')}
        on={pen.speedWidth}
        onChange={(speedWidth) => penSettings.update({ speedWidth })}
      />
      <SwitchRow
        id="lowLatency"
        label={t('ink.pen.lowLatency')}
        on={pen.lowLatency}
        onChange={(lowLatency) => penSettings.update({ lowLatency })}
      />
      <SwitchRow
        id="holdShape"
        label={t('ink.pen.holdShape')}
        note={t('ink.pen.holdShape.note')}
        on={pen.holdShape}
        onChange={(holdShape) => penSettings.update({ holdShape })}
      />
      <SwitchRow
        id="shapeSnap"
        label={t('ink.pen.shapeSnap')}
        note={t('ink.pen.shapeSnap.note')}
        on={pen.shapeSnap}
        onChange={(shapeSnap) => penSettings.update({ shapeSnap })}
      />
      <SwitchRow
        id="shapeFill"
        label={t('ink.pen.shapeFill')}
        note={t('ink.pen.shapeFill.note')}
        on={pen.shapeFill}
        onChange={(shapeFill) => penSettings.update({ shapeFill })}
      />
      <Tip id="ink.finger" touchInfo={false}>
        <ChipRow
          id="finger"
          label={t('ink.finger')}
          value={pen.finger}
          options={FINGER_MODES.map((m) => ({
            value: m,
            label: msg(`ink.finger.${m}`),
          }))}
          onChange={(finger) => penSettings.update({ finger })}
        />
      </Tip>
      <p className="px-2 text-xs text-ink-soft">{t('ink.finger.note')}</p>
    </>
  )
}

function PenGesturesPage() {
  const pen = penSettings.useValue()
  return (
    <>
      <SwitchRow
        id="scribbleErase"
        label={t('ink.pen.scribbleErase')}
        note={t('ink.pen.scribbleErase.note')}
        on={pen.scribbleErase}
        onChange={(scribbleErase) => penSettings.update({ scribbleErase })}
      />
      <SwitchRow
        id="circleLasso"
        label={t('ink.pen.circleLasso')}
        note={t('ink.pen.circleLasso.note')}
        on={pen.circleLasso}
        onChange={(circleLasso) => penSettings.update({ circleLasso })}
      />
    </>
  )
}

function StrokePage() {
  const pen = penSettings.useValue()
  return (
    <>
      <InkPreview kind="pen" />
      <ChipRow
        id="line"
        label={t('main.card.pen.stroke')}
        value={pen.line}
        columns={3}
        options={LINE_STYLES.map((l) => ({
          value: l,
          label: msg(`ink.line.${l}`),
        }))}
        onChange={(line) => penSettings.update({ line })}
      />
      <SliderRow
        id="exact"
        label={t('ink.pen.exact')}
        value={penWidth(pen)}
        min={0.5}
        max={30}
        step={0.5}
        unit=" px"
        onChange={(exact) => penSettings.update({ exact })}
      />
      <ActionRow
        id="useSizes"
        label={t('ink.pen.useSizes')}
        onClick={() => penSettings.update({ exact: null })}
        disabled={pen.exact === null}
      />
    </>
  )
}

/** "Layers (2) ›" on the cards of the tools that draw or select ink. */
function LayersRow({ onPage }: { onPage: (page: string) => void }) {
  const ink = useInk()
  return (
    <Tip id="ink.layers" touchInfo={false}>
      <NavRow
        id="layers"
        label={t('ink.layers')}
        hint={ink ? String(ink.doc.layers.length) : undefined}
        onClick={() => onPage('layers')}
      />
    </Tip>
  )
}

// ---- Colours (pen and highlighter) ----

function ColourPage({ tool }: { tool: 'pen' | 'highlighter' }) {
  const pen = penSettings.useValue()
  const h = highlighterSettings.useValue()
  const [custom, setCustom] = useState(tool === 'pen' ? pen.colour : h.colour)
  const base = tool === 'pen' ? PEN_COLOURS : HIGHLIGHT_COLOURS
  const now = tool === 'pen' ? pen.colour : h.colour
  const choose = (hex: string) =>
    tool === 'pen'
      ? penSettings.update({ colour: hex })
      : highlighterSettings.update({ colour: hex })
  return (
    <>
      <div className="grid grid-cols-3 gap-1 px-1" data-card-colours={tool}>
        {base.map((c) => (
          <button
            key={c.id}
            type="button"
            data-colour={c.hex}
            aria-pressed={now === c.hex}
            onMouseDown={keepFocus}
            onClick={() => choose(c.hex)}
            className={`flex min-h-11 items-center gap-2 rounded-lg border px-2 text-sm ${
              now === c.hex
                ? 'border-accent bg-hover font-semibold'
                : 'border-line'
            }`}
          >
            <span
              aria-hidden
              className="size-5 shrink-0 rounded-full border border-ink-soft"
              style={{ backgroundColor: c.hex }}
            />
            {msg(`ink.colour.${c.id}`)}
          </button>
        ))}
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 px-2 text-sm">
        {t('ink.colour.custom')}
        <input
          type="color"
          data-card-colour-input
          aria-label={t('ink.colour.custom')}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-ink-soft bg-bg"
        />
      </label>
      <ActionRow
        id="addColour"
        icon="plus"
        label={t('ink.colour.add')}
        disabled={!isHex(custom)}
        onClick={() => {
          addCustomColour(custom)
          choose(custom.toLowerCase())
        }}
      />
    </>
  )
}

// ---- Highlighter ----

function HighlighterCard({ onPage }: { onPage: (page: string) => void }) {
  const h = highlighterSettings.useValue()
  return (
    <>
      <InkPreview kind="highlighter" />
      <NavRow
        id="colour"
        label={t('ink.colour.title')}
        onClick={() => onPage('colour')}
      />
      <SwitchRow
        id="snap"
        label={t('ink.hl.snap')}
        note={t('ink.hl.snap.note')}
        on={h.snapToText}
        onChange={(snapToText) => highlighterSettings.update({ snapToText })}
      />
      <SwitchRow
        id="behind"
        label={t('ink.hl.behind')}
        on={h.behindInk}
        onChange={(behindInk) => highlighterSettings.update({ behindInk })}
      />
      <SliderRow
        id="opacity"
        label={t('ink.hl.opacity')}
        value={h.opacity}
        min={20}
        max={90}
        unit="%"
        onChange={(opacity) => highlighterSettings.update({ opacity })}
      />
      <ActionRow
        id="highlightEraser"
        icon="eraser"
        label={t('ink.hl.eraser')}
        onClick={() => {
          eraserSettings.update({ highlightsOnly: true })
          selectTool('eraser')
        }}
      />
      <SwitchRow
        id="saveToNotes"
        label={t('ink.hl.saveToNotes')}
        note={t('ink.hl.saveToNotes.note')}
        on={h.saveToNotes}
        onChange={(saveToNotes) => highlighterSettings.update({ saveToNotes })}
      />
      <LayersRow onPage={onPage} />
    </>
  )
}

// ---- Eraser ----

function EraserCard() {
  const e = eraserSettings.useValue()
  return (
    <>
      <ChipRow
        id="eraserMode"
        label={t('main.opt.eraser.mode')}
        value={e.mode}
        options={ERASER_MODES.map((m) => ({
          value: m,
          label: msg(`ink.eraser.${m}`),
        }))}
        onChange={(mode) => eraserSettings.update({ mode })}
      />
      <p className="px-2 text-xs text-ink-soft">
        {msg(`ink.eraser.${e.mode}.note`)}
      </p>
      <ChipRow
        id="eraserSize"
        label={t('main.opt.eraser.size')}
        value={e.size}
        options={([0, 1, 2] as const).map((i) => ({
          value: i,
          label: msg(`ink.thickness.${i + 1}`),
        }))}
        onChange={(size) => eraserSettings.update({ size })}
      />
      <SwitchRow
        id="highlightsOnly"
        label={t('ink.eraser.highlightsOnly')}
        on={e.highlightsOnly}
        onChange={(highlightsOnly) => eraserSettings.update({ highlightsOnly })}
      />
    </>
  )
}

// ---- Lasso ----

function LassoCard({ onPage }: { onPage: (page: string) => void }) {
  const l = lassoSettings.useValue()
  return (
    <>
      <ChipRow
        id="lassoShape"
        label={t('main.opt.lasso.shape')}
        value={l.shape}
        options={(['free', 'rect'] as const).map((s) => ({
          value: s,
          label: msg(`ink.lasso.${s}`),
          icon: s === 'free' ? 'lasso' : 'square',
        }))}
        onChange={(shape) => lassoSettings.update({ shape })}
      />
      <CardLabel>{t('main.opt.lasso.filter')}</CardLabel>
      {(['ink', 'pictures', 'text'] as const).map((key) => (
        <SwitchRow
          key={key}
          id={`filter-${key}`}
          label={msg(`ink.lasso.filter.${key}`)}
          on={l[key]}
          onChange={(on) => lassoSettings.update({ [key]: on })}
        />
      ))}
      <p className="px-2 text-xs text-ink-soft">{t('main.lasso.note')}</p>
      <LassoRowChoice />
      <LayersRow onPage={onPage} />
    </>
  )
}

/** Which actions sit in the drawing menu's first row; the rest go under ⋯ More. */
function LassoRowChoice() {
  const row = lassoRow.useValue()
  const labels: Record<RowAction, string> = {
    copy: t('main.sel.copy'),
    cut: t('main.sel.cut'),
    duplicate: t('main.sel.duplicate'),
    convert: t('ink.sel.convert'),
    colour: t('main.sel.colour'),
    delete: t('main.sel.delete'),
    thickness: t('ink.sel.thickness'),
    makeCard: t('main.sel.makeCard'),
    summary: t('main.sel.summary'),
    label: t('ink.sel.label'),
  }
  return (
    <>
      <CardLabel>{t('main.opt.lasso.row')}</CardLabel>
      {ROW_ACTIONS.map((id) => (
        <SwitchRow
          key={id}
          id={`row-${id}`}
          label={labels[id]}
          on={row.includes(id)}
          onChange={(on) => setRowAction(id, on)}
        />
      ))}
      <p className="px-2 text-xs text-ink-soft">
        {t('main.opt.lasso.rowNote')}
      </p>
    </>
  )
}

// ---- Read › Aa ----

const AA_TABS = ['font', 'layout', 'themes', 'more'] as const
type AaTab = (typeof AA_TABS)[number]

function SettingChips<T extends string | number>({
  definition,
  columns,
}: {
  definition: SettingDefinition<T>
  columns?: number
}) {
  const [value, setValue] = useDeviceSetting(definition)
  const control = definition.control
  if (control.kind !== 'segmented' && control.kind !== 'select') return null
  return (
    <>
      <CardLabel>{t(definition.labelKey)}</CardLabel>
      <ChipRow
        id={definition.id}
        label={t(definition.labelKey)}
        value={value}
        columns={columns}
        options={control.options.map((o) => ({
          value: o.value as T,
          label: o.label(),
        }))}
        onChange={setValue}
      />
    </>
  )
}

function ReadingFontTiles() {
  const [font, setFont] = useDeviceSetting(readingFontSetting)
  return <FontTiles value={font} none="app" onPick={setFont} />
}

function AaCard() {
  const [tab, setTab] = useState<AaTab>('font')
  return (
    <>
      <div
        role="tablist"
        aria-label={t('main.card.read.aa')}
        className="flex rounded-xl bg-hover"
      >
        {AA_TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            data-aa-tab={name}
            onMouseDown={keepFocus}
            onClick={() => setTab(name)}
            className={`min-h-11 flex-1 rounded-xl text-sm ${
              tab === name ? 'bg-bg font-semibold text-accent shadow-sm' : ''
            }`}
          >
            {msg(`main.aa.${name}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="grid gap-0.5">
        {tab === 'font' && (
          <>
            <ReadingFontTiles />
            <SettingChips
              definition={readingSizeSetting as SettingDefinition<number>}
              columns={5}
            />
          </>
        )}
        {tab === 'layout' && (
          <>
            <SettingChips
              definition={readingSpacingSetting as SettingDefinition<number>}
              columns={4}
            />
            <SettingChips definition={readingMarginSetting} />
            <SettingChips definition={readingWidthSetting} />
            <SettingChips definition={readingFlowSetting} />
          </>
        )}
        {tab === 'themes' && (
          <SettingChips definition={readingThemeSetting} columns={2} />
        )}
        {tab === 'more' && (
          <>
            <SettingChips definition={readingRulerSetting} />
            <SettingChips definition={readingBlanksSetting} />
            <ActionRow
              id="allSettings"
              icon="settings"
              label={t('main.aa.allSettings')}
              onClick={() => runTool('font')}
            />
          </>
        )}
      </div>
    </>
  )
}
