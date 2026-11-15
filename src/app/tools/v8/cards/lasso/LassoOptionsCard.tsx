import {
  CardGroup,
  CardNote,
  CardWell,
} from '../../../../../design/parts/CardParts'
import { FoldGroup } from '../../../../../design/parts/FoldGroup'
import { LayersCard } from '../../../../../ink/LayersCard'
import {
  ROW_ACTIONS,
  lassoRow,
  type RowAction,
} from '../../../../../ink/lassoMenu'
import { rowLabel } from '../../../../../ink/lassoLabels'
import { t } from '../../../../../i18n/t'
import { Icon } from '../../../icons'
import { ROW_ICON, moveRowAction, toggleRowAction } from './lassoModel'

const short = (id: RowAction) =>
  id === 'convert'
    ? t('v8.lasso.convertShort')
    : id === 'summary'
      ? t('v8.lasso.summaryShort')
      : rowLabel(id)

function Preview({ row }: { row: readonly RowAction[] }) {
  return (
    <div className="v8lpreview" data-testid="v8-lasso-preview">
      {row.map((id) => (
        <span key={id} className="v8lpreview-chip">
          <Icon name={ROW_ICON[id]} size={16} />
          {short(id)}
        </span>
      ))}
      <span className="v8lpreview-chip">
        <Icon name="more" size={16} />
        {t('v8.lasso.more')}
      </span>
    </div>
  )
}

function MenuRow({ row }: { row: readonly RowAction[] }) {
  const off = ROW_ACTIONS.filter((id) => !row.includes(id))
  const sw = (id: RowAction, on: boolean) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t('v8.lasso.inRow', { name: rowLabel(id) })}
      className="v8lrow-switch"
      onClick={() => toggleRowAction(id)}
    >
      <span className="pcard-switch" aria-hidden data-on={on || undefined} />
    </button>
  )
  return (
    <div data-testid="v8-lasso-row">
      <CardGroup label={t('v8.lasso.onRow')}>
        <CardWell>
          {row.map((id, i) => (
            <div key={id} className="v8lrow">
              <Icon name={ROW_ICON[id]} size={17} />
              <span className="v8lrow-name">{rowLabel(id)}</span>
              <button
                type="button"
                className="v8lrow-arrow"
                disabled={i === 0}
                aria-label={t('v8.lasso.earlier', { name: rowLabel(id) })}
                onClick={() => moveRowAction(id, -1)}
              >
                <Icon name="chevronUp" size={15} />
              </button>
              <button
                type="button"
                className="v8lrow-arrow"
                disabled={i === row.length - 1}
                aria-label={t('v8.lasso.later', { name: rowLabel(id) })}
                onClick={() => moveRowAction(id, 1)}
              >
                <Icon name="chevronDown" size={15} />
              </button>
              {sw(id, true)}
            </div>
          ))}
        </CardWell>
      </CardGroup>
      {off.length ? (
        <CardGroup label={t('v8.lasso.underMore')}>
          <CardWell testId="v8-lasso-undermore">
            {off.map((id) => (
              <div key={id} className="v8lrow">
                <Icon name={ROW_ICON[id]} size={17} />
                <span className="v8lrow-name">{rowLabel(id)}</span>
                {sw(id, false)}
              </div>
            ))}
          </CardWell>
          <CardNote>{t('v8.lasso.underMoreNote')}</CardNote>
        </CardGroup>
      ) : null}
    </div>
  )
}

/** The Professional Lasso Options card (mock v9): menu picture, Menu row ▾, Layers ▾. */
export function LassoOptionsCard() {
  const row = lassoRow.useValue()
  return (
    <div className="v8scroll">
      <CardGroup label={t('v8.lasso.afterSelect')}>
        <Preview row={row} />
        <CardNote>{t('v8.lasso.previewNote')}</CardNote>
      </CardGroup>
      <FoldGroup
        label={t('v8.lasso.menuRow')}
        icon={<Icon name="list" size={18} />}
        hint={t('v8.lasso.onRowCount', { count: row.length })}
      >
        <MenuRow row={row} />
      </FoldGroup>
      <FoldGroup
        label={t('ink.layers')}
        icon={<Icon name="layers" size={18} />}
      >
        <div data-testid="v8-lasso-layers">
          <LayersCard />
          <CardNote>{t('v8.lasso.layersNote')}</CardNote>
        </div>
      </FoldGroup>
    </div>
  )
}
