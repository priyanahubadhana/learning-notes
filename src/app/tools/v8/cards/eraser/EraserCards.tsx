import {
  CardGroup,
  CardNote,
  CardWell,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { t, type MessageKey } from '../../../../../i18n/t'
import { currentRunner } from '../../../toolRuntime'
import { Icon, type IconName } from '../../../icons'
import { useBarPref } from '../../barPrefs'
import {
  ERASER_SIZES,
  eraseTargets,
  eraserSettings,
  type EraserMode,
} from '../../../main/inkSettings'
import { useUnlocked } from '../../../../../settings/level'
import { Glow } from '../../Glow'
import '../../../../../design/parts/OnOff.css'
import {
  chooseEraserMode,
  chooseEraserSize,
  eraserModes,
  toggleErases,
  type EraseTarget,
} from './eraserModel'
import '../pen/penCards.css'
import '../toolCards.css'

const k = (key: string) => key as MessageKey

const MODE_ICON: Record<EraserMode, IconName> = {
  precise: 'crosshair',
  standard: 'eraser',
  stroke: 'penLine',
}

// ---- Mode (TB-30, TB-30a) ----

/** Size tiles: the Size card, and the simple Eraser card (Beginner) below its types. */
function SizeTiles() {
  const e = eraserSettings.useValue()
  return (
    <Glow k={e.size}>
      <TileGroup label={t('v8.eraser.sizeGroup')} columns={3}>
        {([0, 1, 2] as const).map((i) => (
          <Tile
            key={i}
            label={t(k(`v8.pen.size.${i}`))}
            selected={e.size === i}
            testId={`v8-eraser-size-${i}`}
            onSelect={() => chooseEraserSize(i)}
          >
            <i
              aria-hidden
              style={{
                display: 'block',
                width: ERASER_SIZES[i] * 0.8,
                height: ERASER_SIZES[i] * 0.8,
                border: '2px solid currentColor',
                borderRadius: '50%',
              }}
            />
          </Tile>
        ))}
      </TileGroup>
    </Glow>
  )
}

function ModeCard() {
  const e = eraserSettings.useValue()
  const pro = useUnlocked('tb.eraserOptions')
  const menus = useBarPref('eraserMenus')
  return (
    <>
      <CardGroup>
        <Glow k={e.mode}>
          <TileGroup label={t('v8.eraser.modeGroup')} columns={3}>
            {eraserModes(pro || menus, e.mode).map((mode) => (
              <Tile
                key={mode}
                label={t(k(`ink.eraser.${mode}`))}
                selected={e.mode === mode}
                testId={`v8-eraser-mode-${mode}`}
                onSelect={() => chooseEraserMode(mode)}
              >
                <Icon name={MODE_ICON[mode]} size={22} />
              </Tile>
            ))}
          </TileGroup>
        </Glow>
        <CardNote>{t(k(`ink.eraser.${e.mode}.note`))}</CardNote>
      </CardGroup>
      {menus ? null : (
        <CardGroup label={t('v8.item.size')}>
          <SizeTiles />
        </CardGroup>
      )}
    </>
  )
}

// ---- Options (TB-30b) ----

const TARGETS: readonly EraseTarget[] = ['hl', 'text', 'pen']

/** What the eraser takes: a segmented control; each part on or off, never none. */
function ErasesControl() {
  const e = eraserSettings.useValue()
  const on = eraseTargets(e)
  return (
    <div
      role="group"
      aria-label={t('v8.eraser.erases')}
      className="onoff-choice onoff-block"
      data-testid="v8-eraser-erases"
    >
      {TARGETS.map((id) => (
        <button
          key={id}
          type="button"
          role="checkbox"
          aria-checked={on[id]}
          className="onoff-opt"
          data-testid={`v8-eraser-erases-${id}`}
          onClick={() => {
            if (!toggleErases(id))
              currentRunner().app?.toast(t('v8.eraser.needOne'))
          }}
        >
          {t(k(`v8.eraser.erases.${id}`))}
        </button>
      ))}
    </div>
  )
}

function OptionsCard() {
  const e = eraserSettings.useValue()
  return (
    <>
      <CardGroup label={t('v8.eraser.erases')}>
        <ErasesControl />
        <CardNote>{t('v8.eraser.erases.note')}</CardNote>
      </CardGroup>
      <CardGroup>
        <CardWell>
          <SwitchRow
            label={t('ink.eraser.returnAfter')}
            checked={e.returnAfter}
            onChange={(returnAfter) => eraserSettings.update({ returnAfter })}
          />
        </CardWell>
      </CardGroup>
    </>
  )
}

// ---- Size (TB-30) ----

function SizeCard() {
  const e = eraserSettings.useValue()
  const pro = useBarPref('eraserMenus')
  return (
    <>
      <CardGroup>
        <SizeTiles />
      </CardGroup>
      {pro ? (
        <CardGroup label={t('v8.eraser.ring')}>
          <div className="v8ring" data-testid="v8-eraser-ring">
            <i
              style={{
                width: ERASER_SIZES[e.size],
                height: ERASER_SIZES[e.size],
              }}
            />
          </div>
        </CardGroup>
      ) : null}
    </>
  )
}

/** The body of one Eraser card (`eraser.mode`, `eraser.size`). */
export default function EraserCardBody({ id }: { id: string }) {
  return id === 'eraser.size' ? (
    <SizeCard />
  ) : id === 'eraser.options' ? (
    <OptionsCard />
  ) : (
    <ModeCard />
  )
}
