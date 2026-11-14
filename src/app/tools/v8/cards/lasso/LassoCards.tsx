import {
  CardGroup,
  CardNote,
  CardWell,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'
import { LayersCard } from '../../../../../ink/LayersCard'
import { ROW_ACTIONS, lassoRow } from '../../../../../ink/lassoMenu'
import { rowLabel } from '../../../../../ink/lassoLabels'
import { t, type MessageKey } from '../../../../../i18n/t'
import { useUnlocked } from '../../../../../settings/level'
import { Icon } from '../../../icons'
import { lassoSettings } from '../../../main/inkSettings'
import { Glow } from '../../Glow'
import {
  LASSO_ACTIONS,
  LASSO_FILTERS,
  actionLabel,
  setLassoFilter,
  setLassoShape,
  toggleRowAction,
} from './lassoModel'
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
              <Icon name={shape === 'free' ? 'lasso' : 'square'} size={22} />
            </Tile>
          ))}
        </TileGroup>
      </Glow>
    </CardGroup>
  )
}

function ActionsCard() {
  const pro = useUnlocked('tb.lassoOptions')
  const l = lassoSettings.useValue()
  const row = lassoRow.useValue()
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
      {pro ? (
        <>
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
          <CardGroup label={t('main.opt.lasso.row')}>
            <CardWell testId="v8-lasso-row">
              {ROW_ACTIONS.map((id) => (
                <SwitchRow
                  key={id}
                  label={rowLabel(id)}
                  checked={row.includes(id)}
                  onChange={() => toggleRowAction(id)}
                />
              ))}
            </CardWell>
            <CardNote>{t('main.opt.lasso.rowNote')}</CardNote>
          </CardGroup>
          <CardGroup label={t('ink.layers')}>
            <LayersCard />
          </CardGroup>
        </>
      ) : null}
    </div>
  )
}

/** The body of one Lasso card (`lasso.shape`, `lasso.actions`). */
export default function LassoCardBody({ id }: { id: string }) {
  return id === 'lasso.actions' ? <ActionsCard /> : <ShapeCard />
}
