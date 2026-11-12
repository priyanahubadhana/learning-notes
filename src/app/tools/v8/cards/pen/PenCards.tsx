import { useState } from 'react'
import {
  CardGroup,
  CardNote,
  CardWell,
  SwitchRow,
  Swatch,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { TabRow, type TabDef } from '../../../../../design/parts/TabRow'
import { memoryTabSetStore } from '../../../../../design/parts/tabSets'
import { t, type MessageKey } from '../../../../../i18n/t'
import { Icon } from '../../../icons'
import { InkPreview } from '../../../main/InkPreview'
import {
  FINGER_MODES,
  HIGHLIGHT_WIDTHS,
  LINE_STYLES,
  PEN_WIDTHS,
  addCustomColour,
  customColours,
  highlighterSettings,
  isHex,
  penSettings,
} from '../../../main/inkSettings'
import { activeTool } from '../../../main/mainTools'
import { LayersCard } from '../../../../../ink/LayersCard'
import { bumpInk, useInk } from '../../../../../ink/inkRuntime'
import {
  magnifierTool,
  rulerTool,
  toggleMagnifier,
  toggleRuler,
} from '../../../../../ink/toolState'
import { PAPER_STYLES, paperStyleKey } from '../../../../../pages/paperStyles'
import type { Page } from '../../../../../core/types'
import { useUnlocked } from '../../../../../settings/level'
import { Glow } from '../../Glow'
import {
  isHighlighter,
  TYPE_IDS,
  usePenFace,
  type PenTypeId,
} from '../../penFace'
import { Slider } from './Slider'
import {
  DRAW_AS_CHOICES,
  FEEL_TABS,
  TYPE_HINT,
  TYPE_LOOK,
  chooseColour,
  chooseSize,
  chooseType,
  feelTabs,
  highlightEraser,
  samplePath,
  sameColour,
  swatchesFor,
  type FeelTab,
} from './penModel'
import './penCards.css'

const k = (key: string) => key as MessageKey

/** A wavy sample stroke in the given look. */
function Sample({
  look,
  colour,
  width = 64,
  height = 26,
}: {
  look: { w: number; cap: 'round' | 'butt' | 'square'; o: number }
  colour: string
  width?: number
  height?: number
}) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={samplePath(width, height)}
        fill="none"
        stroke={colour}
        strokeWidth={look.w}
        strokeLinecap={look.cap}
        opacity={look.o}
      />
    </svg>
  )
}

// ---- Type (TB-20) ----

function TypeCard() {
  const face = usePenFace()
  return (
    <CardGroup>
      <Glow k={face.typeId}>
        <TileGroup label={t('v8.pen.typeGroup')} columns={3}>
          {TYPE_IDS.map((id: PenTypeId) => (
            <Tile
              key={id}
              label={t(k(`v8.pen.type.${id}`))}
              selected={face.typeId === id}
              testId={`v8-pen-type-${id}`}
              onSelect={() => chooseType(id)}
            >
              <span className="v8tiletype">
                <Sample look={TYPE_LOOK[id]} colour={face.colour} />
                <small>{t(k(TYPE_HINT[id]))}</small>
              </span>
            </Tile>
          ))}
        </TileGroup>
      </Glow>
    </CardGroup>
  )
}

// ---- Size (TB-22) ----

const SIZE_IDS = [0, 1, 2] as const

function SizeCard() {
  const face = usePenFace()
  const mode = activeTool.useValue()
  const hl = isHighlighter(mode)
  const stroke = useUnlocked('tb.penStroke')
  const pen = penSettings.useValue()
  const widths = hl ? HIGHLIGHT_WIDTHS : PEN_WIDTHS[pen.type]
  return (
    <>
      <CardGroup>
        <Glow k={`${face.size}-${face.exact}`}>
          <TileGroup label={t('v8.pen.sizeGroup')} columns={3}>
            {SIZE_IDS.map((i) => {
              const px = widths[i]
              return (
                <Tile
                  key={i}
                  label={t(k(`v8.pen.size.${i}`))}
                  selected={face.size === i && !face.exact}
                  testId={`v8-pen-size-${i}`}
                  onSelect={() => chooseSize(mode, i)}
                >
                  <svg width="44" height="22" viewBox="0 0 44 22" aria-hidden>
                    <line
                      x1="6"
                      y1="11"
                      x2="38"
                      y2="11"
                      stroke={face.colour}
                      strokeWidth={Math.min(hl ? px * 0.7 : px, 18)}
                      strokeLinecap={hl ? 'butt' : 'round'}
                      opacity={hl ? 0.55 : 1}
                    />
                  </svg>
                </Tile>
              )
            })}
          </TileGroup>
        </Glow>
      </CardGroup>
      {stroke ? (
        <>
          <CardGroup>
            <InkPreview kind={hl ? 'highlighter' : 'pen'} />
          </CardGroup>
          {hl ? null : (
            <>
              <CardGroup>
                <Slider
                  label={t('ink.pen.exact')}
                  value={face.px}
                  min={0.5}
                  max={30}
                  step={0.5}
                  unit=" px"
                  wedge
                  testId="v8-pen-exact"
                  onChange={(exact) => penSettings.update({ exact })}
                />
                <button
                  type="button"
                  className="v8btn"
                  data-testid="v8-pen-usesizes"
                  disabled={!face.exact}
                  onClick={() => penSettings.update({ exact: null })}
                >
                  {t('ink.pen.useSizes')}
                </button>
              </CardGroup>
              <CardGroup label={t('v8.pen.lineStyle')}>
                <Glow k={pen.line}>
                  <TileGroup label={t('v8.pen.lineStyle')} columns={3}>
                    {LINE_STYLES.map((l) => (
                      <Tile
                        key={l}
                        label={t(k(`ink.line.${l}`))}
                        selected={pen.line === l}
                        testId={`v8-pen-line-${l}`}
                        onSelect={() => penSettings.update({ line: l })}
                      >
                        <svg
                          width="44"
                          height="14"
                          viewBox="0 0 44 14"
                          aria-hidden
                        >
                          <line
                            x1="4"
                            y1="7"
                            x2="40"
                            y2="7"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={
                              l === 'dashed'
                                ? '7 5'
                                : l === 'dotted'
                                  ? '0.1 6'
                                  : undefined
                            }
                          />
                        </svg>
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
            </>
          )}
        </>
      ) : null}
    </>
  )
}

// ---- Colour (TB-23) ----

function ColourCard() {
  const face = usePenFace()
  const mode = activeTool.useValue()
  const custom = customColours.useValue()
  const pro = useUnlocked('tb.customColours')
  const [draft, setDraft] = useState(face.colour)
  const base = swatchesFor(mode)
  const extras = pro
    ? custom.filter((c) => !base.some((b) => sameColour(b.hex, c)))
    : []
  return (
    <>
      <CardGroup>
        <Glow k={face.colour}>
          <TileGroup label={t('v8.pen.colours')} columns={3}>
            {base.map((c) => (
              <Swatch
                key={c.id}
                colour={c.hex}
                label={t(k(`ink.colour.${c.id}`))}
                selected={sameColour(face.colour, c.hex)}
                testId={`v8-pen-colour-${c.id}`}
                onSelect={() => chooseColour(mode, c.hex)}
              />
            ))}
          </TileGroup>
        </Glow>
      </CardGroup>
      {pro ? (
        <>
          {extras.length > 0 ? (
            <CardGroup label={t('v8.pen.customColours')}>
              <TileGroup label={t('v8.pen.customColours')} columns={3}>
                {extras.map((hex) => (
                  <Swatch
                    key={hex}
                    colour={hex}
                    label={hex}
                    selected={sameColour(face.colour, hex)}
                    testId="v8-pen-custom"
                    onSelect={() => chooseColour(mode, hex)}
                  />
                ))}
              </TileGroup>
            </CardGroup>
          ) : null}
          <CardGroup label={t('v8.pen.pickColour')}>
            <div className="v8pick">
              <input
                type="color"
                className="v8colourinput"
                aria-label={t('v8.pen.pickColour')}
                data-testid="v8-pen-picker"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="button"
                className="v8btn"
                data-testid="v8-pen-addcolour"
                disabled={!isHex(draft)}
                onClick={() => {
                  addCustomColour(draft)
                  chooseColour(mode, draft)
                }}
              >
                <Icon name="plus" size={16} />
                {t('ink.colour.add')}
              </button>
            </div>
            <CardNote>{t('v8.pen.customNote')}</CardNote>
          </CardGroup>
        </>
      ) : null}
    </>
  )
}

// ---- Feel (TB-24, TB-25, TB-26) ----

const feelStore = memoryTabSetStore()
const FEEL_LABEL: Record<FeelTab, MessageKey> = {
  feel: 'v8.item.feel',
  aids: 'v8.pen.tab.aids',
  math: 'v8.pen.tab.math',
  page: 'v8.pen.tab.page',
}

function FeelCard() {
  const aids = useUnlocked('tb.penAids')
  const catalog: TabDef[] = FEEL_TABS.map((id) => ({
    id,
    label: t(FEEL_LABEL[id]),
    ...(id === 'aids' ? { pro: 'tb.penAids' } : {}),
  }))
  const [tab, setTab] = useState<FeelTab>('feel')
  const shown = feelTabs(() => aids)
  const current = shown.includes(tab) ? tab : 'feel'
  return (
    <>
      <TabRow
        setKey="v8.penFeel"
        store={feelStore}
        catalog={catalog}
        defaults={[...FEEL_TABS]}
        value={current}
        onPick={(id) => setTab(id as FeelTab)}
        variant="pill"
        editable={false}
        unlocked={() => aids}
        label={t('v8.pen.tabs')}
      />
      <div
        role="tabpanel"
        className="v8pane"
        data-testid={`v8-pen-pane-${current}`}
      >
        {current === 'feel' ? <FeelPane /> : null}
        {current === 'aids' ? <AidsPane /> : null}
        {current === 'math' ? <MathPane /> : null}
        {current === 'page' ? <PagePane /> : null}
      </div>
    </>
  )
}

function FeelPane() {
  const mode = activeTool.useValue()
  const hl = isHighlighter(mode)
  const pen = penSettings.useValue()
  const h = highlighterSettings.useValue()
  const feel = useUnlocked('tb.penFeel')
  const hlPro = useUnlocked('tb.highlighter')
  const [fine, setFine] = useState(false)
  return (
    <>
      <CardGroup>
        <InkPreview kind={hl ? 'highlighter' : 'pen'} />
      </CardGroup>
      {hl ? (
        <>
          <CardGroup>
            <Slider
              label={t('ink.hl.opacity')}
              value={h.opacity}
              min={20}
              max={90}
              unit="%"
              testId="v8-hl-opacity"
              onChange={(opacity) => highlighterSettings.update({ opacity })}
            />
          </CardGroup>
          {hlPro ? (
            <CardGroup label={t('v8.pen.onPage')}>
              <CardWell>
                <SwitchRow
                  label={t('ink.hl.snap')}
                  checked={h.snapToText}
                  onChange={(snapToText) =>
                    highlighterSettings.update({ snapToText })
                  }
                />
                <SwitchRow
                  label={t('ink.hl.behind')}
                  checked={h.behindInk}
                  onChange={(behindInk) =>
                    highlighterSettings.update({ behindInk })
                  }
                />
                <SwitchRow
                  label={t('ink.hl.saveToNotes')}
                  checked={h.saveToNotes}
                  onChange={(saveToNotes) =>
                    highlighterSettings.update({ saveToNotes })
                  }
                />
              </CardWell>
              <button
                type="button"
                className="v8btn"
                data-testid="v8-hl-eraser"
                onClick={highlightEraser}
              >
                <Icon name="eraser" size={16} />
                {t('ink.hl.eraser')}
              </button>
            </CardGroup>
          ) : null}
        </>
      ) : (
        <>
          <CardGroup>
            <Slider
              label={t('ink.pen.pressure')}
              value={pen.pressure}
              min={0}
              max={100}
              testId="v8-pen-pressure"
              onChange={(pressure) => penSettings.update({ pressure })}
            />
            <CardNote>{t('v8.pen.pressure.note')}</CardNote>
            <Slider
              label={t('ink.pen.stabilisation')}
              value={pen.stabilisation}
              min={0}
              max={100}
              testId="v8-pen-stabilisation"
              onChange={(stabilisation) =>
                penSettings.update({ stabilisation })
              }
            />
            <CardNote>{t('v8.pen.stabilisation.note')}</CardNote>
          </CardGroup>
          <CardGroup>
            <button
              type="button"
              className="v8disc"
              aria-expanded={fine}
              data-testid="v8-pen-finetune"
              onClick={() => setFine((o) => !o)}
            >
              <Icon name="sliders" size={18} />
              <span>{t('v8.pen.fineTune')}</span>
              <Icon name="chevronDown" size={16} />
            </button>
            {fine ? (
              <div data-testid="v8-pen-finebody">
                <Glow k={pen.drawAs}>
                  <TileGroup label={t('ink.drawAs')} columns={4}>
                    {DRAW_AS_CHOICES.map((d) => (
                      <Tile
                        key={d}
                        label={t(k(`ink.drawAs.${d}`))}
                        selected={pen.drawAs === d}
                        testId={`v8-pen-drawas-${d}`}
                        onSelect={() => penSettings.update({ drawAs: d })}
                      />
                    ))}
                  </TileGroup>
                </Glow>
                {feel ? (
                  <>
                    <Slider
                      label={t('ink.pen.sharpness')}
                      value={pen.sharpness}
                      min={0}
                      max={100}
                      testId="v8-pen-sharpness"
                      onChange={(sharpness) =>
                        penSettings.update({ sharpness })
                      }
                    />
                    {pen.type === 'fountain' ? (
                      <Slider
                        label={t('ink.pen.flatness')}
                        value={pen.flatness}
                        min={0}
                        max={100}
                        testId="v8-pen-flatness"
                        onChange={(flatness) =>
                          penSettings.update({ flatness })
                        }
                      />
                    ) : null}
                    <CardWell>
                      <SwitchRow
                        label={t('ink.pen.tilt')}
                        checked={pen.tilt}
                        onChange={(tilt) => penSettings.update({ tilt })}
                      />
                      <SwitchRow
                        label={t('ink.pen.speedWidth')}
                        checked={pen.speedWidth}
                        onChange={(speedWidth) =>
                          penSettings.update({ speedWidth })
                        }
                      />
                      <SwitchRow
                        label={t('ink.pen.lowLatency')}
                        checked={pen.lowLatency}
                        onChange={(lowLatency) =>
                          penSettings.update({ lowLatency })
                        }
                      />
                    </CardWell>
                  </>
                ) : null}
              </div>
            ) : null}
          </CardGroup>
        </>
      )}
    </>
  )
}

function AidsPane() {
  const pen = penSettings.useValue()
  return (
    <>
      <CardGroup label={t('ink.finger')}>
        <Glow k={pen.finger}>
          <TileGroup label={t('ink.finger')} columns={3}>
            {FINGER_MODES.map((m) => (
              <Tile
                key={m}
                label={t(k(`ink.finger.${m}`))}
                selected={pen.finger === m}
                testId={`v8-pen-finger-${m}`}
                onSelect={() => penSettings.update({ finger: m })}
              />
            ))}
          </TileGroup>
        </Glow>
        <CardNote>{t('ink.finger.note')}</CardNote>
      </CardGroup>
      <CardGroup label={t('v8.pen.gestures')}>
        <CardWell>
          <SwitchRow
            label={t('ink.pen.scribbleErase')}
            checked={pen.scribbleErase}
            onChange={(scribbleErase) => penSettings.update({ scribbleErase })}
          />
          <SwitchRow
            label={t('ink.pen.circleLasso')}
            checked={pen.circleLasso}
            onChange={(circleLasso) => penSettings.update({ circleLasso })}
          />
        </CardWell>
      </CardGroup>
    </>
  )
}

function MathPane() {
  const pen = penSettings.useValue()
  const aids = useUnlocked('tb.shapesAids')
  const ruler = rulerTool.useValue()
  const mag = magnifierTool.useValue()
  return (
    <>
      <CardGroup label={t('v8.pen.shapeHelp')}>
        <CardWell>
          <SwitchRow
            label={t('ink.pen.holdShape')}
            checked={pen.holdShape}
            onChange={(holdShape) => penSettings.update({ holdShape })}
          />
          <SwitchRow
            label={t('ink.pen.shapeSnap')}
            checked={pen.shapeSnap}
            onChange={(shapeSnap) => penSettings.update({ shapeSnap })}
          />
          <SwitchRow
            label={t('ink.pen.shapeFill')}
            checked={pen.shapeFill}
            onChange={(shapeFill) => penSettings.update({ shapeFill })}
          />
        </CardWell>
      </CardGroup>
      {aids ? (
        <CardGroup label={t('v8.pen.mathTools')}>
          <CardWell>
            <SwitchRow
              label={t('v8.pen.ruler')}
              checked={ruler.on}
              onChange={() => toggleRuler()}
            />
            <SwitchRow
              label={t('ink.magnifier')}
              checked={mag.on}
              onChange={() => toggleMagnifier()}
            />
          </CardWell>
        </CardGroup>
      ) : null}
    </>
  )
}

function PagePane() {
  const ink = useInk()
  const layers = useUnlocked('tb.layers')
  const live = ink?.paper()
  // The page saves the paper a moment later: show the pick at once.
  const [picked, setPicked] = useState<{
    bg: Page['inkBg']
    base: Page['inkBg']
  } | null>(null)
  const paper = picked && picked.base === live ? picked.bg : live
  return (
    <>
      <CardGroup label={t('ink.paper')}>
        {ink ? (
          <Glow k={paper ?? 'blank'}>
            <TileGroup label={t('ink.paper')} columns={4}>
              {PAPER_STYLES.map((bg) => (
                <Tile
                  key={bg ?? 'blank'}
                  label={t(paperStyleKey(bg))}
                  selected={paper === bg}
                  testId={`v8-pen-paper-${bg ?? 'blank'}`}
                  onSelect={() => {
                    setPicked({ bg, base: live })
                    ink.setPaper(bg)
                    bumpInk()
                  }}
                />
              ))}
            </TileGroup>
          </Glow>
        ) : (
          <CardNote>{t('ink.layers.empty')}</CardNote>
        )}
      </CardGroup>
      {layers ? (
        <CardGroup label={t('ink.layers')}>
          <LayersCard />
        </CardGroup>
      ) : null}
    </>
  )
}

/** The body of one Pen card (`pen.type`, `pen.size`, `pen.colour`, `pen.feel`). */
export default function PenCardBody({ id }: { id: string }) {
  switch (id) {
    case 'pen.type':
      return <TypeCard />
    case 'pen.size':
      return <SizeCard />
    case 'pen.colour':
      return <ColourCard />
    case 'pen.feel':
      return <FeelCard />
    default:
      return null
  }
}
