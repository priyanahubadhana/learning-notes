import { lazy, Suspense } from 'react'
import {
  CardGroup,
  CardWell,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { t, type MessageKey } from '../../../../../i18n/t'
import {
  addCustomColour,
  isHex,
  penSettings,
  type DrawAs,
} from '../../../main/inkSettings'
import {
  magnifierTool,
  rulerTool,
  toggleMagnifier,
  toggleRuler,
} from '../../../../../ink/toolState'
import { useUnlocked } from '../../../../../settings/level'
import { Glow } from '../../Glow'
import { Icon } from '../../../icons'
import { SHAPE_CHOICES, chooseShape } from './shapesModel'
import '../pen/penCards.css'
import '../toolCards.css'

const PenCardBody = lazy(() => import('../pen/PenCards'))

const k = (key: string) => key as MessageKey

/** A small outline of each shape, drawn in the tile. */
function Glyph({ shape }: { shape: DrawAs }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5 }
  return (
    <svg width="44" height="30" viewBox="0 0 44 30" aria-hidden>
      {shape === 'line' ? (
        <line x1="6" y1="24" x2="38" y2="6" {...p} strokeLinecap="round" />
      ) : shape === 'arrow' ? (
        <path
          d="M6 15 H36 M28 7 L37 15 L28 23"
          {...p}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : shape === 'rect' ? (
        <rect x="7" y="6" width="30" height="18" rx="2" {...p} />
      ) : shape === 'ellipse' ? (
        <ellipse cx="22" cy="15" rx="16" ry="10" {...p} />
      ) : (
        <path d="M22 5 L38 25 H6 Z" {...p} strokeLinejoin="round" />
      )}
    </svg>
  )
}

function ShapeCard() {
  const pen = penSettings.useValue()
  const aids = useUnlocked('tb.shapesAids')
  const ruler = rulerTool.useValue()
  const mag = magnifierTool.useValue()
  return (
    <>
      <CardGroup label={t('v8.shapes.drawAs')}>
        <Glow k={pen.drawAs}>
          <TileGroup label={t('v8.shapes.drawAs')} columns={3}>
            {SHAPE_CHOICES.map((id) => (
              <Tile
                key={id}
                label={t(k(`ink.drawAs.${id}`))}
                selected={pen.drawAs === id}
                testId={`v8-shape-${id}`}
                onSelect={() => chooseShape(id)}
              >
                <Glyph shape={id} />
              </Tile>
            ))}
          </TileGroup>
        </Glow>
      </CardGroup>
      <CardGroup label={t('v8.pen.shapeHelp')}>
        <CardWell>
          <SwitchRow
            label={t('v8.shapes.holdShape')}
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
            {/* The shared round swatch with ▾; the browser picker sits
                invisible over the row and only opens the system dialog. */}
            <label className="pcard-row v8swatchrow">
              <span>{t('v8.pen.pickColour')}</span>
              <span className="v8swatchpick" aria-hidden>
                <i
                  className="pcard-swatch"
                  style={{
                    background: isHex(pen.colour) ? pen.colour : '#000000',
                  }}
                />
                <Icon name="chevronDown" size={16} />
              </span>
              <input
                type="color"
                className="v8swatchinput"
                aria-label={t('v8.pen.pickColour')}
                data-testid="v8-shape-picker"
                value={isHex(pen.colour) ? pen.colour : '#000000'}
                onChange={(e) => {
                  addCustomColour(e.target.value)
                  penSettings.update({ colour: e.target.value.toLowerCase() })
                }}
              />
            </label>
          </CardWell>
        </CardGroup>
      ) : null}
    </>
  )
}

/**
 * The body of one Shapes card. Size and Colour are the Pen's own cards:
 * Shapes draws with the pen, so both read and write the same settings.
 */
export default function ShapesCardBody({ id }: { id: string }) {
  if (id === 'shapes.size' || id === 'shapes.colour')
    return (
      <Suspense fallback={null}>
        <PenCardBody id={id === 'shapes.size' ? 'pen.size' : 'pen.colour'} />
      </Suspense>
    )
  return <ShapeCard />
}
