import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { runTask } from '../../app/errors'
import { Glow } from '../../app/tools/v8/Glow'
import {
  CardGroup,
  CardNote,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../design/parts/CardParts'
import { Card } from '../../design/parts/Card'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { group as historyGroup } from '../../core/historySteps'
import {
  BORDER_WIDTHS,
  cleanStyle,
  COLOUR_TOKENS,
  frameCss,
  MAX_OWN_PRESETS,
  NAMED_PRESETS,
  PADS,
  RADII,
  sameStyle,
  SWATCHES,
  type BoxStyle,
  type OwnPreset,
} from '../../core/boxStyle'
import type { LearningNotesDB } from '../../core/db'
import { t, type MessageKey } from '../../i18n/t'
import { useUnlocked } from '../../settings/level'
import { boxesOf, BOX_COLOURS, MAIN_BOX } from '../boxes'
import { updateBox } from '../boxService'
import { applyLayout, applyNotebook } from '../layoutAssistService'
import { arrangeAll, noteRecentLayout, type GridInfo } from '../layoutPlan'
import { placesOf } from '../grid'
import { openLayoutMode } from '../layoutModeBus'
import {
  changeNewBoxStyle,
  deletePreset,
  loadNewBoxStyle,
  loadPresets,
  renamePreset,
  savePreset,
  setNewBoxStyle,
} from '../boxPresets'
import './boxCard.css'

const name = (key: string) => t(key as MessageKey)

/** The three looks Beginner sees first (TB-26); Professional adds the rest. */
const BASIC_LOOKS = [
  { id: 'plain', style: {} as BoxStyle },
  {
    id: 'sticky',
    style: NAMED_PRESETS.find((p) => p.id === 'sticky')!.style,
  },
  {
    id: 'callout',
    style: NAMED_PRESETS.find((p) => p.id === 'callout')!.style,
  },
] as const
const MORE_LOOKS = NAMED_PRESETS.filter(
  (p) => p.id !== 'sticky' && p.id !== 'callout',
)
/** Fill swatches: no fill, then the five box colours (the old ⋯ › Colour). */
const FILLS = ['none', ...Object.keys(BOX_COLOURS)] as const

const preview = (s: BoxStyle | undefined) =>
  frameCss({ ...s, radius: undefined, shadow: undefined })

/** The selected box's frame: the card hangs around it and never covers it. */
const boxRect = (boxId: string) => () => {
  const r = document
    .querySelector(`[data-paper-box="${CSS.escape(boxId)}"]`)
    ?.getBoundingClientRect()
  if (!r) return null
  // The frame, the dots and the tab sit just outside the box: keep clear too.
  const pad = 24
  return {
    left: r.left - pad,
    top: r.top - pad,
    width: r.width + 2 * pad,
    height: r.height + 2 * pad,
  }
}

/**
 * TB-25 to TB-29 (switch textbox.v2): the Box card. Opens beside the box with
 * sections Box and Layout; a tall card scrolls inside itself. Beginner sees
 * looks and fill; Professional (`tb.textBox`, `tb.layouts`) adds the rest.
 * Every control of the old Box style panel has a place here.
 */
export default function BoxCard({
  db,
  pageId,
  boxId,
  getGrid,
  onClose,
}: {
  db: LearningNotesDB
  pageId: string
  boxId: string
  getGrid: () => GridInfo
  onClose: () => void
}) {
  const phone = usePhone()
  const proBox = useUnlocked('tb.textBox')
  const proLayouts = useUnlocked('tb.layouts')
  const page = useLiveQuery(() => db.pages.get(pageId), [db, pageId])
  const box = page ? boxesOf(page).find((b) => b.id === boxId) : undefined
  const style = cleanStyle(box?.style) ?? {}
  const [section, setSection] = useState<'box' | 'layout'>('box')
  const [own, setOwn] = useState<OwnPreset[]>([])
  const [dflt, setDflt] = useState<BoxStyle | undefined>(undefined)
  const [editing, setEditing] = useState<string | null>(null)
  const [allPages, setAllPages] = useState(false)
  // Where the box was when the card opened (the card is placed around it).
  const [anchor] = useState(() => boxRect(boxId)() ?? undefined)

  useEffect(() => {
    void loadPresets(db).then(setOwn)
    void loadNewBoxStyle(db).then(setDflt)
  }, [db])

  // One write, one Undo step. A new box remembers the last look you gave a box;
  // the page's own box keeps its look to itself.
  const apply = (next: BoxStyle | undefined) => {
    runTask(updateBox(db, pageId, boxId, { style: cleanStyle(next) }))
    if (boxId !== MAIN_BOX) {
      setDflt(cleanStyle(next))
      void setNewBoxStyle(db, cleanStyle(next))
    }
  }
  const patch = (p: BoxStyle) => apply({ ...style, ...p, preset: undefined })
  const setFill = (fill: string) =>
    runTask(
      updateBox(db, pageId, boxId, {
        colour: fill === 'none' ? undefined : fill,
      }),
    )
  const useNew = !!dflt && sameStyle(dflt, style)
  const full = own.length >= MAX_OWN_PRESETS

  const lookTile = (id: string, label: string, s: BoxStyle) => (
    <Tile
      key={id}
      label={label}
      selected={
        id === 'plain' ? !Object.keys(style).length : style.preset === id
      }
      testId={`bc-look-${id}`}
      onSelect={() => apply({ ...s, preset: id === 'plain' ? undefined : id })}
    >
      <span className="v8boxprev" style={preview(s)} />
    </Tile>
  )

  const layoutTile = (presetId: string, label: string) => (
    <Tile
      key={presetId}
      action
      label={label}
      testId={`bc-layout-${presetId}`}
      onSelect={() => void arrange(presetId)}
    >
      <span className={`bc-lay bc-lay-${presetId}`} aria-hidden>
        <i />
        <i />
        {presetId === 'six' && (
          <>
            <i />
            <i />
            <i />
            <i />
          </>
        )}
      </span>
    </Tile>
  )

  /** A layout for this page, or for every page of the notebook: one Undo. */
  const arrange = async (presetId: string) => {
    const info = getGrid()
    if (allPages && proLayouts && page) {
      await historyGroup('Layout', () =>
        applyNotebook(db, page.notebookId, presetId),
      )
      noteRecentLayout(presetId)
      return
    }
    const rows = arrangeAll(info.rows, presetId)
    if (!rows) return
    await historyGroup('Layout', () =>
      applyLayout(db, pageId, rows, placesOf(rows, info.heights, info.geo), []),
    )
    noteRecentLayout(presetId)
  }

  return (
    <Card
      anchor={anchor ?? null}
      size="panel"
      title={t('boxStyle.title')}
      testId="bc-card"
      around={phone ? undefined : boxRect(boxId)}
      clearTop={() => 12}
      onClose={onClose}
    >
      <div role="group" aria-label={t('boxCard.sections')} className="bc-seg">
        {(['box', 'layout'] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            data-testid={`bc-tab-${id}`}
            onClick={() => setSection(id)}
          >
            {t(id === 'box' ? 'boxCard.box' : 'layout.title')}
          </button>
        ))}
      </div>

      {section === 'box' ? (
        <>
          <CardGroup label={t('boxCard.look')}>
            <Glow k={JSON.stringify(style)}>
              <TileGroup label={t('boxCard.look')} columns={4}>
                {BASIC_LOOKS.map((l) =>
                  lookTile(
                    l.id,
                    t(`boxCard.look.${l.id}` as MessageKey),
                    l.style,
                  ),
                )}
                {own.map((p) =>
                  lookTile(p.id, p.name, { ...p.style, preset: p.id }),
                )}
              </TileGroup>
            </Glow>
          </CardGroup>
          <CardGroup label={t('boxCard.fill')}>
            <Glow k={box?.colour ?? 'none'}>
              <TileGroup label={t('boxCard.fill')} columns={6}>
                {FILLS.map((f) => (
                  <Tile
                    key={f}
                    label={name(`boxCard.fill.${f}`)}
                    selected={(box?.colour ?? 'none') === f}
                    testId={`bc-fill-${f}`}
                    onSelect={() => setFill(f)}
                  >
                    <i
                      className={`pcard-swatch${f === 'none' ? ' bc-none' : ''}`}
                      style={
                        f === 'none'
                          ? undefined
                          : { background: BOX_COLOURS[f] }
                      }
                    />
                  </Tile>
                ))}
              </TileGroup>
            </Glow>
          </CardGroup>

          {proBox && (
            <>
              <CardGroup label={t('boxCard.moreLooks')}>
                <Glow k={JSON.stringify(style)}>
                  <TileGroup label={t('boxCard.moreLooks')} columns={4}>
                    {MORE_LOOKS.map((p) =>
                      lookTile(p.id, name('boxStyle.preset.' + p.id), p.style),
                    )}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxCard.quick')}>
                <Glow k={JSON.stringify(style)}>
                  <TileGroup label={t('boxCard.quick')} columns={5}>
                    {SWATCHES.map((s) => (
                      <Tile
                        key={s.id}
                        label={name('boxStyle.sw.' + s.id)}
                        selected={
                          sameStyle(style, s.style) ||
                          (!box?.style && s.id === 'none')
                        }
                        testId={`bc-quick-${s.id}`}
                        onSelect={() => apply({ ...s.style, preset: s.id })}
                      >
                        <span
                          className="v8boxprev v8boxprev-sm"
                          style={preview(s.style)}
                        />
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxStyle.bg')}>
                <Glow k={style.bg ?? 'none'}>
                  <TileGroup label={t('boxStyle.bg')} columns={6}>
                    {COLOUR_TOKENS.map((c) => (
                      <Tile
                        key={c}
                        label={name('boxStyle.sw.' + c)}
                        selected={(style.bg ?? 'none') === c}
                        testId={`bc-bg-${c}`}
                        onSelect={() => patch({ bg: c })}
                      >
                        <span
                          className="v8boxprev v8boxprev-sm"
                          style={preview({ bg: c })}
                        />
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxStyle.border')}>
                <Glow k={style.border ?? 'none'}>
                  <TileGroup label={t('boxStyle.border')} columns={6}>
                    {COLOUR_TOKENS.map((c) => (
                      <Tile
                        key={c}
                        label={name('boxStyle.sw.' + c)}
                        selected={(style.border ?? 'none') === c}
                        testId={`bc-border-${c}`}
                        onSelect={() => patch({ border: c })}
                      >
                        <span
                          className="v8boxprev v8boxprev-sm"
                          style={preview({ bg: c })}
                        />
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxStyle.borderW')}>
                <Glow k={style.borderW ?? 0}>
                  <TileGroup label={t('boxStyle.borderW')} columns={4}>
                    {BORDER_WIDTHS.map((w) => (
                      <Tile
                        key={w}
                        label={`${w} px`}
                        selected={(style.borderW ?? 0) === w}
                        testId={`bc-borderw-${w}`}
                        onSelect={() => patch({ borderW: w })}
                      >
                        <span className="v8num">{w}</span>
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxStyle.radius')}>
                <Glow k={style.radius ?? 0}>
                  <TileGroup label={t('boxStyle.radius')} columns={5}>
                    {RADII.map((r) => (
                      <Tile
                        key={r}
                        label={`${r} px`}
                        selected={(style.radius ?? 0) === r}
                        testId={`bc-radius-${r}`}
                        onSelect={() => patch({ radius: r })}
                      >
                        <span className="v8num">{r}</span>
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxStyle.pad')}>
                <Glow k={style.pad ?? 0}>
                  <TileGroup label={t('boxStyle.pad')} columns={5}>
                    {PADS.map((p) => (
                      <Tile
                        key={p}
                        label={`${p} px`}
                        selected={(style.pad ?? 0) === p}
                        testId={`bc-pad-${p}`}
                        onSelect={() => patch({ pad: p })}
                      >
                        <span className="v8num">{p}</span>
                      </Tile>
                    ))}
                  </TileGroup>
                </Glow>
              </CardGroup>
              <CardGroup>
                <Glow k={style.shadow ? 1 : 0}>
                  <SwitchRow
                    label={t('boxStyle.shadow')}
                    checked={!!style.shadow}
                    onChange={(on) => patch({ shadow: on })}
                  />
                </Glow>
              </CardGroup>
              <CardGroup label={t('boxStyle.mine')}>
                <ul className="bc-mine">
                  {own.map((p) => (
                    <li key={p.id}>
                      {editing === p.id ? (
                        <>
                          <input
                            autoFocus
                            defaultValue={p.name}
                            aria-label={t('boxStyle.rename')}
                            data-testid="bc-rename"
                            onBlur={(e) => {
                              void renamePreset(db, p.id, e.target.value).then(
                                setOwn,
                              )
                              setEditing(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                              if (e.key === 'Escape') {
                                e.stopPropagation()
                                setEditing(null)
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="bc-x"
                            aria-label={t('boxCard.cancelName')}
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => setEditing(null)}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="bc-pick"
                            onClick={() => apply({ ...p.style, preset: p.id })}
                          >
                            {p.name}
                          </button>
                          <button
                            type="button"
                            className="bc-act"
                            onClick={() => setEditing(p.id)}
                          >
                            {t('boxStyle.rename')}
                          </button>
                          <button
                            type="button"
                            className="bc-x"
                            aria-label={t('boxStyle.delete')}
                            onClick={() =>
                              void deletePreset(db, p.id).then(setOwn)
                            }
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="bc-act bc-save"
                  data-testid="bc-save"
                  disabled={full}
                  onClick={() =>
                    void savePreset(
                      db,
                      t('boxCard.saveName', { n: own.length + 1 }),
                      style,
                    ).then((n) => n && setOwn(n))
                  }
                >
                  {full ? t('boxStyle.full') : t('boxCard.save')}
                </button>
              </CardGroup>
              <CardGroup>
                <SwitchRow
                  label={t('boxStyle.useNew')}
                  checked={useNew}
                  onChange={(on) =>
                    void changeNewBoxStyle(
                      db,
                      dflt,
                      on ? cleanStyle(style) : undefined,
                      setDflt,
                    )
                  }
                />
                <button
                  type="button"
                  className="bc-act bc-reset"
                  data-testid="bc-reset"
                  onClick={() => apply(undefined)}
                >
                  {t('boxStyle.reset')}
                </button>
              </CardGroup>
            </>
          )}
        </>
      ) : (
        <>
          <CardGroup label={t('boxCard.layouts')}>
            <TileGroup label={t('boxCard.layouts')} action columns={3}>
              {layoutTile('two', t('layout.two'))}
              {layoutTile('six', t('layout.six'))}
              <Tile
                action
                label={t('boxCard.assist')}
                testId="bc-assist"
                onSelect={() => {
                  onClose()
                  openLayoutMode(pageId)
                }}
              >
                <span className="bc-lay bc-lay-assist" aria-hidden>
                  <i />
                  <i />
                </span>
              </Tile>
            </TileGroup>
          </CardGroup>
          {proLayouts && (
            <CardGroup>
              <SwitchRow
                label={t('boxCard.allPages')}
                checked={allPages}
                onChange={setAllPages}
              />
              <CardNote>{t('boxCard.allPagesNote')}</CardNote>
            </CardGroup>
          )}
        </>
      )}
    </Card>
  )
}
