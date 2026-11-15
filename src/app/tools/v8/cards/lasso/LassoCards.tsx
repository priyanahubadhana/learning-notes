import {
  CardGroup,
  CardNote,
  CardWell,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { t, type MessageKey } from '../../../../../i18n/t'
import { Icon } from '../../../icons'
import { lassoSettings } from '../../../main/inkSettings'
import { Glow } from '../../Glow'
import {
  LASSO_ACTIONS,
  LASSO_FILTERS,
  actionLabel,
  setLassoFilter,
  setLassoShape,
} from './lassoModel'
import { LassoOptionsCard } from './LassoOptionsCard'
import '../pen/penCards.css'
import '../toolCards.css'

const k = (key: string) => key as MessageKey

function ShapeCard() {
  const l = lassoSettings.useValue()
  return (
    <CardGroup>
      <Glow k={l.shape}>
        <TileGroup label={t('v8.lasso.shapeGroup')} columns={2}>
          {(['free', 'rect'] as const).map((shape) => (
            <Tile
              key={shape}
              label={t(k(`ink.lasso.${shape}`))}
              selected={l.shape === shape}
              testId={`v8-lasso-shape-${shape}`}
              onSelect={() => setLassoShape(shape)}
            >
              <Icon
                name={shape === 'free' ? 'lasso' : 'squareDashed'}
                size={22}
              />
            </Tile>
          ))}
        </TileGroup>
      </Glow>
    </CardGroup>
  )
}

function ActionsCard() {
  return (
    <div className="v8scroll">
      <CardGroup label={t('v8.lasso.actionsGroup')}>
        <ul className="v8list" data-testid="v8-lasso-actions">
          {LASSO_ACTIONS.map((a) => (
            <li key={a.id}>
              <Icon name={a.icon} size={18} />
              {t(actionLabel(a.id))}
            </li>
          ))}
        </ul>
      </CardGroup>
      <CardNote>{t('v8.lasso.actionsNote')}</CardNote>
    </div>
  )
}

/** What it picks: the same three switches as the bar chips (a narrow bar folds them here). */
function PicksCard() {
  const l = lassoSettings.useValue()
  return (
    <CardGroup label={t('v8.lasso.picks')}>
      <CardWell testId="v8-lasso-picks">
        {LASSO_FILTERS.map(([key]) => (
          <SwitchRow
            key={key}
            label={t(k(`ink.lasso.filter.${key}`))}
            checked={l[key]}
            onChange={(on) => setLassoFilter(key, on)}
          />
        ))}
      </CardWell>
    </CardGroup>
  )
}

/** The body of one Lasso card (`lasso.shape`, `lasso.actions`, `lasso.picks`, `lasso.opts`). */
export default function LassoCardBody({ id }: { id: string }) {
  if (id === 'lasso.opts') return <LassoOptionsCard />
  if (id === 'lasso.picks') return <PicksCard />
  return id === 'lasso.actions' ? <ActionsCard /> : <ShapeCard />
}
