import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  BORDER_WIDTHS,
  PADS,
  RADII,
  SWATCHES,
  cleanStyle,
  frameCss,
  sameStyle,
  type BoxStyle,
} from '../../../../../core/boxStyle'
import { db } from '../../../../../core/db'
import {
  CardGroup,
  CardNote,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { t, type MessageKey } from '../../../../../i18n/t'
import { activeBox } from '../../../../../paper/activeBox'
import { boxesOf } from '../../../../../paper/boxes'
import { updateBox } from '../../../../../paper/boxService'
import {
  loadNewBoxStyle,
  changeNewBoxStyle,
} from '../../../../../paper/boxPresets'
import { openLayoutMode } from '../../../../../paper/layoutModeBus'
import { useUnlocked } from '../../../../../settings/level'
import { Icon } from '../../../icons'
import { Glow } from '../../Glow'
import FormatCard from './FormatCard'
import { BOX_LOOKS } from './textModel'
import '../toolCards.css'
import './textCards.css'

const k = (key: string) => key as MessageKey

function useActiveBoxStyle() {
  const at = useSyncExternalStore(activeBox.subscribe, activeBox.get)
  const page = useLiveQuery(
    () => (at ? db.pages.get(at.pageId) : undefined),
    [at?.pageId],
  )
  const box =
    page && at ? boxesOf(page).find((b) => b.id === at.boxId) : undefined
  const [dflt, setDflt] = useState<BoxStyle | undefined>(undefined)
  useEffect(() => {
    void loadNewBoxStyle(db).then(setDflt)
  }, [at?.boxId])
  const style = box ? box.style : dflt
  const write = (next: BoxStyle | undefined) => {
    const clean = cleanStyle(next)
    if (box && at) void updateBox(db, at.pageId, box.id, { style: clean })
    else void changeNewBoxStyle(db, dflt, clean, setDflt)
  }
  return { at, box, style, write }
}

const preview = (s: BoxStyle | undefined) => frameCss(s)

/** TB-42: the box's look; Professional adds fill, border, corners, padding, shadow. */
function BoxCard() {
  const { box, style, write } = useActiveBoxStyle()
  const pro = useUnlocked('tb.textBox')
  const patch = (p: BoxStyle) => write({ ...style, ...p, preset: undefined })
  return (
    <div className="v8scroll v8thin v8scroll-box" data-testid="v8-box">
      {box ? null : <CardNote>{t('v8.box.noBox')}</CardNote>}
      <CardGroup label={t('v8.box.looks')}>
        <Glow k={JSON.stringify(cleanStyle(style) ?? {})}>
          <TileGroup label={t('v8.box.looks')} columns={3}>
            {BOX_LOOKS.map((look) => (
              <Tile
                key={look.id}
                label={t(look.label)}
                selected={sameStyle(style, look.style)}
                testId={`v8-box-look-${look.id}`}
                onSelect={() => write(look.style)}
              >
                <span
                  className="v8boxprev"
                  style={preview({ ...look.style, radius: undefined })}
                />
              </Tile>
            ))}
          </TileGroup>
        </Glow>
      </CardGroup>
      {pro ? (
        <>
          <CardGroup label={t('boxStyle.bg')}>
            <TileGroup label={t('boxStyle.bg')} columns={5}>
              {SWATCHES.map((sw) => (
                <Tile
                  key={sw.id}
                  label={t(k(`boxStyle.sw.${sw.id}`))}
                  selected={(style?.bg ?? 'none') === (sw.style.bg ?? 'none')}
                  testId={`v8-box-bg-${sw.id}`}
                  onSelect={() => patch({ bg: sw.style.bg ?? 'none' })}
                >
                  <span
                    className="v8boxprev v8boxprev-sm"
                    style={preview({ bg: sw.style.bg })}
                  />
                </Tile>
              ))}
            </TileGroup>
          </CardGroup>
          <CardGroup label={t('boxStyle.borderW')}>
            <TileGroup label={t('boxStyle.borderW')} columns={4}>
              {BORDER_WIDTHS.map((w) => (
                <Tile
                  key={w}
                  label={`${w}`}
                  selected={(style?.borderW ?? 0) === w}
                  testId={`v8-box-border-${w}`}
                  onSelect={() =>
                    patch({ borderW: w, border: style?.border ?? 'line' })
                  }
                >
                  <span className="v8num">{w}</span>
                </Tile>
              ))}
            </TileGroup>
          </CardGroup>
          <CardGroup label={t('boxStyle.radius')}>
            <TileGroup label={t('boxStyle.radius')} columns={5}>
              {RADII.map((r) => (
                <Tile
                  key={r}
                  label={`${r}`}
                  selected={(style?.radius ?? 0) === r}
                  testId={`v8-box-radius-${r}`}
                  onSelect={() => patch({ radius: r })}
                >
                  <span className="v8num">{r}</span>
                </Tile>
              ))}
            </TileGroup>
          </CardGroup>
          <CardGroup label={t('boxStyle.pad')}>
            <TileGroup label={t('boxStyle.pad')} columns={5}>
              {PADS.map((p) => (
                <Tile
                  key={p}
                  label={`${p}`}
                  selected={(style?.pad ?? 0) === p}
                  testId={`v8-box-pad-${p}`}
                  onSelect={() => patch({ pad: p })}
                >
                  <span className="v8num">{p}</span>
                </Tile>
              ))}
            </TileGroup>
          </CardGroup>
          <CardGroup>
            <SwitchRow
              label={t('boxStyle.shadow')}
              checked={!!style?.shadow}
              onChange={(on) => patch({ shadow: on })}
            />
          </CardGroup>
        </>
      ) : null}
    </div>
  )
}

/** The settings button in front of Box: new-box look and Layout (columns). */
function BoxSettingsCard() {
  const { at, box, style } = useActiveBoxStyle()
  const layout = useUnlocked('tb.textBox')
  const [saved, setSaved] = useState(false)
  const look = BOX_LOOKS.find((l) => sameStyle(style, l.style))
  const lookName = look ? t(look.label) : t('v8.box.look.custom')
  return (
    <CardGroup label={t('v8.box.newGroup')}>
      <button
        type="button"
        data-chrome
        className="v8fold-row v8setrow"
        data-testid="v8-boxset-new"
        disabled={!box}
        onClick={() => {
          void loadNewBoxStyle(db).then((before) =>
            changeNewBoxStyle(db, before, style, () => {}),
          )
          setSaved(true)
        }}
      >
        <Icon name="palette" size={18} />
        <span>{t('v8.box.useNew')}</span>
        <span className="v8setrow-value" data-testid="v8-boxset-value">
          {lookName}
        </span>
        {saved ? <Icon name="check" size={18} /> : null}
      </button>
      {box ? null : <CardNote>{t('v8.box.useNewHint')}</CardNote>}
      {layout ? (
        <button
          type="button"
          className="pcard-row v8actrow"
          data-testid="v8-boxset-layout"
          disabled={!at}
          onClick={() => at && openLayoutMode(at.pageId)}
        >
          <span>{t('layout.title')}</span>
          <Icon name="grid" size={18} />
        </button>
      ) : null}
    </CardGroup>
  )
}

export default function TextCards({ id }: { id: string }) {
  if (id === 'text.format') return <FormatCard />
  if (id === 'text.boxset') return <BoxSettingsCard />
  return <BoxCard />
}
