import { useActiveStyles, useBlockNoteEditor } from '@blocknote/react'
import { useState, type ReactNode } from 'react'
import { ClearField } from '../../../../../design/parts/ClearField'
import {
  CardGroup,
  Swatch,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import {
  BACKGROUND_HEX,
  COLOR_NAMES,
  TEXT_HEX,
  colorLabel,
  setColor,
} from '../../../../../editor/colorData'
import { useActiveStyles as useStyles } from '../../../../../editor/useActiveStyles'
import { t, type MessageKey } from '../../../../../i18n/t'
import { useUnlocked } from '../../../../../settings/level'
import { FontTiles } from '../../../../reading/FontTiles'
import {
  NOTE_LINES,
  NOTE_SIZES,
  applyNoteStyle,
  noteFont,
  noteLine,
  noteSize,
} from '../../../main/textStyle'
import { highlightChoice, textColourChoice } from '../../../main/pillChoices'
import { Icon } from '../../../icons'
import { runTool, findTool, toolLabel } from '../../../toolRegistry'
import { useBarPref } from '../../barPrefs'
import { CardTabs } from '../CardTabs'
import {
  ALIGNMENTS,
  TEXT_SIZE_STEPS,
  formatTabs,
  type FormatGroup,
  type FormatTabId,
  type FormatTile,
} from './textModel'

const k = (key: string) => key as MessageKey
type BnEditor = ReturnType<typeof useBlockNoteEditor>

/** One Format tile: the style drawn in its own look, or its icon. */
function Face({ tile }: { tile: FormatTile }) {
  if (tile.look === 'icon' && tile.icon)
    return <Icon name={tile.icon} size={22} />
  const sample = tile.look.startsWith('h') ? 'Aa' : 'A'
  return <span className={`v8look v8look-${tile.look}`}>{sample}</span>
}

function tileName(tile: FormatTile): string {
  if (tile.label.startsWith('v8.')) return t(tile.label)
  const def = findTool(tile.tool)
  return def ? toolLabel(def) : t(tile.label)
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** A segmented control: one choice of a few, 44 pt tall, raised chosen part. */
function Seg({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="v8tabs v8seg" role="radiogroup" aria-label={label}>
      {children}
    </div>
  )
}

function SegButton({
  label,
  on,
  testId,
  onPick,
  children,
}: {
  label: string
  on: boolean
  testId: string
  onPick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={label}
      data-testid={testId}
      className={on ? 'v8tab v8tab-sel' : 'v8tab'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      {children}
    </button>
  )
}

/** The block (or blocks) the cursor is in. */
function targetBlocks(editor: BnEditor) {
  const sel = editor.getSelection()
  return sel ? sel.blocks : [editor.getTextCursorPosition().block]
}

/** Alignment as one segmented control, Justify included. */
function AlignGroup() {
  const editor = useBlockNoteEditor()
  useStyles(editor as never)
  let now = 'left'
  try {
    const props = editor.getTextCursorPosition().block.props as Record<
      string,
      unknown
    >
    if (typeof props.textAlignment === 'string') now = props.textAlignment
  } catch {
    /* no cursor yet: left */
  }
  return (
    <CardGroup label={t('v8.format.g.align')}>
      <Seg label={t('v8.format.g.align')}>
        {ALIGNMENTS.map((a) => (
          <SegButton
            key={a.id}
            label={t(
              k(
                a.id === 'justify'
                  ? 'v8.format.align.justify'
                  : `tool.align${cap(a.id)}`,
              ),
            )}
            on={now === a.id}
            testId={`v8-format-align${cap(a.id)}`}
            onPick={() => {
              for (const b of targetBlocks(editor as unknown as BnEditor))
                if ('textAlignment' in b.props)
                  editor.updateBlock(b, {
                    props: { textAlignment: a.id },
                  } as never)
              editor.focus()
            }}
          >
            <Icon name={a.icon} size={18} />
          </SegButton>
        ))}
      </Seg>
    </CardGroup>
  )
}

/** Heading 1-3 and Quote as style rows, each drawn in its own look. */
function StyleRows({ group }: { group: FormatGroup }) {
  const editor = useBlockNoteEditor()
  useStyles(editor as never)
  let type = ''
  let level = 0
  try {
    const b = editor.getTextCursorPosition().block
    type = b.type
    level = Number((b.props as Record<string, unknown>).level ?? 0)
  } catch {
    /* no cursor yet */
  }
  return (
    <CardGroup label={t(group.title)}>
      <div className="pcard-well">
        {group.tiles.map((tile) => {
          const on =
            tile.tool === 'quote'
              ? type === 'quote'
              : type === 'heading' && tile.tool === `heading${level}`
          return (
            <button
              key={tile.tool}
              type="button"
              className="v8stylerow"
              aria-pressed={on}
              data-testid={`v8-format-${tile.tool}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runTool(tile.tool)}
            >
              <span className={`v8look v8look-${tile.look}`}>
                {tileName(tile)}
              </span>
              {on ? <Icon name="check" size={16} /> : null}
            </button>
          )
        })}
      </div>
    </CardGroup>
  )
}

/** Link: a field with its ✕ and an Add button, inside the card (no pop-up). */
function LinkField({ onDone }: { onDone: () => void }) {
  const editor = useBlockNoteEditor()
  const [url, setUrl] = useState('')
  const add = () => {
    const raw = url.trim()
    if (!raw) return
    const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
    if (editor.getSelectedText()) editor.createLink(href)
    else editor.createLink(href, raw)
    editor.focus()
    onDone()
  }
  return (
    <div className="v8linkrow" data-testid="v8-format-linkfield">
      <ClearField
        type="url"
        inputMode="url"
        value={url}
        placeholder={t('v8.format.link.address')}
        aria-label={t('v8.format.link.address')}
        data-testid="v8-format-linkinput"
        onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
        onClear={() => setUrl('')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
        }}
      />
      <button
        type="button"
        className="v8linkadd"
        data-testid="v8-format-linkadd"
        disabled={!url.trim()}
        onClick={add}
      >
        {t('v8.format.link.add')}
      </button>
    </div>
  )
}

function ToolGroup({ group, link }: { group: FormatGroup; link?: boolean }) {
  const editor = useBlockNoteEditor()
  const active = useActiveStyles(editor as never) as Record<string, unknown>
  let blockType = ''
  try {
    blockType = editor.getTextCursorPosition().block.type
  } catch {
    /* no cursor yet */
  }
  const isOn = (tile: FormatTile): boolean =>
    (!!tile.style && !!active[tile.style]) ||
    (!!tile.block && tile.block === blockType) ||
    (!!tile.mark && active.mark === tile.mark)
  const [linking, setLinking] = useState(false)
  if (group.id === 'headings') return <StyleRows group={group} />
  return (
    <CardGroup label={t(group.title)}>
      <TileGroup label={t(group.title)} multi columns={group.columns}>
        {group.tiles.map((tile) => (
          <Tile
            key={tile.tool}
            multi={!tile.action}
            action={tile.action}
            label={tileName(tile)}
            selected={isOn(tile)}
            testId={`v8-format-${tile.tool}`}
            onSelect={() => runTool(tile.tool)}
          >
            <Face tile={tile} />
          </Tile>
        ))}
        {link ? (
          <Tile
            action
            pressed={linking}
            label={t('tool.link')}
            testId="v8-format-link"
            onSelect={() => setLinking((v) => !v)}
          >
            <Icon name="link" size={22} />
          </Tile>
        ) : null}
      </TileGroup>
      {link && linking ? <LinkField onDone={() => setLinking(false)} /> : null}
    </CardGroup>
  )
}

/** Text colour or highlight: the swatches sit in the tab (T16, T17), no pop-up. */
function ColourGroup({ kind }: { kind: 'textColor' | 'backgroundColor' }) {
  const editor = useBlockNoteEditor()
  const styles = useActiveStyles(editor as never) as Record<string, unknown>
  const now =
    typeof styles[kind] === 'string' ? (styles[kind] as string) : 'default'
  const hex = kind === 'textColor' ? TEXT_HEX : BACKGROUND_HEX
  const title = t(
    k(
      kind === 'textColor' ? 'v8.format.g.textColour' : 'v8.format.g.highlight',
    ),
  )
  const id = kind === 'textColor' ? 'textColor' : 'highlight'
  return (
    <CardGroup label={title}>
      <div
        className="v8swatches"
        onMouseDown={(e) => e.preventDefault()}
        data-testid={`v8-format-${id}`}
      >
        <TileGroup label={title} columns={5}>
          {COLOR_NAMES.map((name) => (
            <Swatch
              key={name}
              colour={
                kind === 'backgroundColor' && TEXT_HEX[name]
                  ? `color-mix(in srgb, ${TEXT_HEX[name]} 55%, transparent)`
                  : (hex[name] ?? 'transparent')
              }
              label={colorLabel(name)}
              selected={now === name}
              testId={`v8-format-${id}-${name}`}
              onSelect={() => {
                if (name !== 'default') {
                  if (kind === 'textColor') textColourChoice.set(name)
                  else highlightChoice.set(name)
                }
                setColor(editor as never, kind, name)
              }}
            />
          ))}
        </TileGroup>
      </div>
    </CardGroup>
  )
}

/** Beginner: three steps; with tb.textFonts: five sizes and compact font tiles. */
function SizeGroups({ fonts }: { fonts: boolean }) {
  const size = noteSize.useValue()
  const font = noteFont.useValue()
  const pick = (n: number) => {
    noteSize.set(n)
    applyNoteStyle()
  }
  if (!fonts)
    return (
      <CardGroup label={t('v8.format.g.textSize')}>
        <TileGroup label={t('v8.format.g.textSize')} columns={3}>
          {TEXT_SIZE_STEPS.map((s) => (
            <Tile
              key={s.id}
              label={t(s.label)}
              selected={size === s.pct}
              testId={`v8-format-tsize-${s.id}`}
              onSelect={() => pick(s.pct)}
            >
              <span className="v8num" style={{ fontSize: 12 + s.pct / 10 }}>
                Aa
              </span>
            </Tile>
          ))}
        </TileGroup>
      </CardGroup>
    )
  return (
    <>
      <CardGroup label={t('v8.format.g.font')}>
        <FontTiles
          compact
          value={font}
          none="default"
          onPick={(f) => {
            noteFont.set(f)
            applyNoteStyle()
          }}
        />
      </CardGroup>
      <CardGroup label={t('v8.format.g.textSize')}>
        <TileGroup label={t('v8.format.g.textSize')} columns={5}>
          {NOTE_SIZES.map((n) => (
            <Tile
              key={n}
              label={`${n}%`}
              selected={size === n}
              testId={`v8-format-size-${n}`}
              onSelect={() => pick(n)}
            >
              <span className="v8num" style={{ fontSize: 8 + n / 10 }}>
                Aa
              </span>
            </Tile>
          ))}
        </TileGroup>
      </CardGroup>
    </>
  )
}

/** Line height as one segmented control. */
function LineHeightGroup() {
  const line = noteLine.useValue()
  return (
    <CardGroup label={t('main.text.lineHeight')}>
      <Seg label={t('main.text.lineHeight')}>
        {NOTE_LINES.map((l) => (
          <SegButton
            key={l}
            label={t(k(`main.line.${l}`))}
            on={line === l}
            testId={`v8-format-line-${l}`}
            onPick={() => {
              noteLine.set(l)
              applyNoteStyle()
            }}
          >
            {t(k(`main.line.${l}`))}
          </SegButton>
        ))}
      </Seg>
    </CardGroup>
  )
}

/** TB-41 (v9): one card, a tab row, colours, fonts and sizes inside the tabs. */
export default function FormatCard() {
  const fonts = useUnlocked('tb.textFonts')
  const marks = useUnlocked('tb.textMarks')
  // The "Format tabs 3 / 4" setting (Settings, Layout row): 4 adds Advanced.
  const advanced = useBarPref('formatTabs')
  const tabs = formatTabs({ advanced, textMarks: marks })
  const [picked, setPicked] = useState<FormatTabId>('text')
  const tab = tabs.find((x) => x.id === picked) ?? tabs[0]
  return (
    <div className="v8scroll v8thin" data-testid="v8-format">
      <CardTabs
        tabs={tabs.map((x) => ({
          id: x.id,
          label: t(x.title),
          testId: `v8-format-tab-${x.id}`,
        }))}
        value={tab.id}
        onPick={(id) => setPicked(id as FormatTabId)}
        label={t('v8.format.tabs')}
      />
      <div role="tabpanel" className="v8tabpanel">
        {tab.id === 'text' ? (
          <>
            <SizeGroups fonts={fonts} />
            <ToolGroup group={tab.groups[0]} />
            <ColourGroup kind="textColor" />
            <ColourGroup kind="backgroundColor" />
            {tab.groups.slice(1).map((g) => (
              <ToolGroup
                key={g.id}
                group={g}
                link={g.id === 'marks' && marks}
              />
            ))}
          </>
        ) : tab.id === 'advanced' ? (
          <LineHeightGroup />
        ) : tab.id === 'paragraph' ? (
          <AlignGroup />
        ) : (
          tab.groups.map((g) => <ToolGroup key={g.id} group={g} />)
        )}
      </div>
    </div>
  )
}
