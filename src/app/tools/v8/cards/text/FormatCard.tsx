import { useActiveStyles, useBlockNoteEditor } from '@blocknote/react'
import { useState, type KeyboardEvent } from 'react'
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
import {
  TEXT_SIZE_STEPS,
  formatTabs,
  type FormatGroup,
  type FormatTabId,
  type FormatTile,
} from './textModel'

const k = (key: string) => key as MessageKey

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

function ToolGroup({ group }: { group: FormatGroup }) {
  const editor = useBlockNoteEditor()
  const active = useActiveStyles(editor as never) as Record<string, unknown>
  return (
    <CardGroup label={t(group.title)}>
      <TileGroup label={t(group.title)} multi columns={group.columns}>
        {group.tiles.map((tile) => (
          <Tile
            key={tile.tool}
            multi={!tile.action}
            action={tile.action}
            label={tileName(tile)}
            selected={!!tile.style && !!active[tile.style]}
            testId={`v8-format-${tile.tool}`}
            onSelect={() => runTool(tile.tool)}
          >
            <Face tile={tile} />
          </Tile>
        ))}
      </TileGroup>
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
              colour={hex[name] ?? 'transparent'}
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

/** Beginner: three steps; with tb.textFonts: the font tiles and five sizes. */
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
              <span className="v8num">{n}%</span>
            </Tile>
          ))}
        </TileGroup>
      </CardGroup>
    </>
  )
}

/** Line height, each choice drawn with its own spacing. */
function LineHeightGroup() {
  const line = noteLine.useValue()
  return (
    <CardGroup label={t('main.text.lineHeight')}>
      <TileGroup label={t('main.text.lineHeight')} columns={3}>
        {NOTE_LINES.map((l) => (
          <Tile
            key={l}
            label={t(k(`main.line.${l}`))}
            selected={line === l}
            testId={`v8-format-line-${l}`}
            onSelect={() => {
              noteLine.set(l)
              applyNoteStyle()
            }}
          >
            <span className={`v8look v8line v8line-${l}`}>Aa Aa</span>
          </Tile>
        ))}
      </TileGroup>
    </CardGroup>
  )
}

/** The tab row: full width inside the card, 44 pt tall, arrows move between tabs. */
function TabBar({
  tabs,
  value,
  onPick,
}: {
  tabs: { id: FormatTabId; title: MessageKey }[]
  value: FormatTabId
  onPick: (id: FormatTabId) => void
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((x) => x.id === value)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(i + step + tabs.length) % tabs.length]
    onPick(next.id)
    e.currentTarget
      .querySelector<HTMLElement>(`[data-tab="${next.id}"]`)
      ?.focus()
  }
  return (
    <div
      className="v8tabs"
      role="tablist"
      aria-label={t('v8.format.tabs')}
      onKeyDown={onKey}
    >
      {tabs.map((x) => (
        <button
          key={x.id}
          type="button"
          role="tab"
          data-tab={x.id}
          data-testid={`v8-format-tab-${x.id}`}
          aria-selected={value === x.id}
          tabIndex={value === x.id ? 0 : -1}
          className={value === x.id ? 'v8tab v8tab-sel' : 'v8tab'}
          onClick={() => onPick(x.id)}
        >
          {t(x.title)}
        </button>
      ))}
    </div>
  )
}

/** TB-41 (v9): one card, a tab row, colours, fonts and sizes inside the tabs. */
export default function FormatCard() {
  const fonts = useUnlocked('tb.textFonts')
  const marks = useUnlocked('tb.textMarks')
  const tabs = formatTabs({ textFonts: fonts, textMarks: marks })
  const [picked, setPicked] = useState<FormatTabId>('text')
  const tab = tabs.find((x) => x.id === picked) ?? tabs[0]
  return (
    <div className="v8scroll v8thin" data-testid="v8-format">
      <TabBar tabs={tabs} value={tab.id} onPick={setPicked} />
      <div role="tabpanel" className="v8tabpanel">
        {tab.id === 'text' ? (
          <>
            <SizeGroups fonts={fonts} />
            <ToolGroup group={tab.groups[0]} />
            <ColourGroup kind="textColor" />
            <ColourGroup kind="backgroundColor" />
            {tab.groups.slice(1).map((g) => (
              <ToolGroup key={g.id} group={g} />
            ))}
          </>
        ) : tab.id === 'advanced' ? (
          <LineHeightGroup />
        ) : (
          tab.groups.map((g) => <ToolGroup key={g.id} group={g} />)
        )}
      </div>
    </div>
  )
}
