import {
  CardGroup,
  CardNote,
  CardWell,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { t, type MessageKey } from '../../../../../i18n/t'
import { Icon, type IconName } from '../../../icons'
import {
  ERASER_SIZES,
  eraserSettings,
  type EraserMode,
} from '../../../main/inkSettings'
import { useUnlocked } from '../../../../../settings/level'
import { Glow } from '../../Glow'
import { chooseEraserMode, chooseEraserSize, eraserModes } from './eraserModel'
import '../pen/penCards.css'
import '../toolCards.css'

const k = (key: string) => key as MessageKey

const MODE_ICON: Record<EraserMode, IconName> = {
  precise: 'crosshair',
  standard: 'eraser',
  stroke: 'penLine',
}

// ---- Type (TB-30) ----

function ModeCard() {
  const e = eraserSettings.useValue()
  const pro = useUnlocked('tb.eraserOptions')
  return (
    <>
      <CardGroup>
        <Glow k={e.mode}>
          <TileGroup label={t('v8.eraser.modeGroup')} columns={3}>
            {eraserModes(pro, e.mode).map((mode) => (
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
      {pro ? (
        <CardGroup label={t('v8.eraser.options')}>
          <CardWell>
            <SwitchRow
              label={t('ink.eraser.highlightsOnly')}
              checked={e.highlightsOnly}
              onChange={(highlightsOnly) =>
                eraserSettings.update({ highlightsOnly })
              }
            />
            <SwitchRow
              label={t('ink.eraser.returnAfter')}
              checked={e.returnAfter}
              onChange={(returnAfter) => eraserSettings.update({ returnAfter })}
            />
          </CardWell>
        </CardGroup>
      ) : null}
    </>
  )
}

// ---- Size (TB-30) ----

function SizeCard() {
  const e = eraserSettings.useValue()
  const pro = useUnlocked('tb.eraserOptions')
  return (
    <>
      <CardGroup>
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
  return id === 'eraser.size' ? <SizeCard /> : <ModeCard />
}
