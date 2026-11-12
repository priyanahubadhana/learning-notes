import { useState } from 'react'
import type { JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { ClearField } from '../../design/parts/ClearField'
import { OnOffChoice } from '../../design/parts/OnOff'
import type { SettingDefinition } from '../registry'
import { tv } from './tv'
import { LabelsEditor } from './LabelsEditor'

interface Props {
  definition: SettingDefinition
  value: JsonValue
  onSave(next: JsonValue): void
  label: string
  descId: string
}

/** The edit control of one row: every button and field is 44 pt or more. */
export function RowControl(props: Props) {
  const { definition, value, onSave, label, descId } = props
  const c = definition.control
  if (c.kind === 'segmented' || c.kind === 'select') {
    if (c.options.length <= 4)
      return (
        <OnOffChoice
          label={label}
          value={value as string | number}
          options={c.options.map((o) => ({ value: o.value, label: o.label() }))}
          onChange={(v) => onSave(v)}
        />
      )
    return (
      <select
        aria-label={label}
        aria-describedby={descId}
        className="sv3-select"
        value={String(value)}
        onChange={(e) => {
          const o = c.options.find((x) => String(x.value) === e.target.value)
          if (o) onSave(o.value)
        }}
      >
        {c.options.map((o) => (
          <option key={o.value} value={String(o.value)}>
            {o.label()}
          </option>
        ))}
      </select>
    )
  }
  if (c.kind === 'number')
    return <NumberField {...props} control={c} key={String(value)} />
  if (c.kind === 'steps')
    return <StepsField {...props} control={c} key={JSON.stringify(value)} />
  if (c.kind === 'action')
    return (
      <button
        type="button"
        className="sv3-btn"
        aria-describedby={descId}
        onClick={c.run}
      >
        {t(c.buttonKey)}
      </button>
    )
  return <LabelsEditor value={value} onSave={onSave} descId={descId} />
}

function NumberField({
  definition,
  value,
  onSave,
  label,
  descId,
  control,
}: Props & {
  control: { kind: 'number'; min: number; max: number } & Record<
    string,
    unknown
  >
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [error, setError] = useState(false)
  const commit = () => {
    const text = draft.trim()
    const next: JsonValue =
      text === '' && control.emptyKey ? null : text === '' ? NaN : Number(text)
    if (!definition.isValid(next)) return setError(true)
    setError(false)
    if (next !== value) onSave(next)
  }
  const unit = control.unitKey as Parameters<typeof t>[0] | undefined
  return (
    <div className="sv3-num">
      <div className="sv3-num-row">
        <ClearField
          inputMode="numeric"
          value={draft}
          aria-label={label}
          aria-describedby={descId}
          aria-invalid={error}
          onChange={(e) => setDraft(e.target.value)}
          onClear={() => setDraft('')}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="sv3-num-field"
        />
        {unit && <span className="sv3-line-help">{t(unit)}</span>}
      </div>
      {error && (
        <p role="alert" className="sv3-error">
          {t('settings.error.number', { min: control.min, max: control.max })}
        </p>
      )}
    </div>
  )
}

function StepsField({
  definition,
  value,
  onSave,
  descId,
  control,
}: Props & {
  control: {
    kind: 'steps'
    min: number
    max: number
    maxCount: number
  } & Record<string, unknown>
}) {
  const [draft, setDraft] = useState(
    Array.isArray(value) ? value.map(String) : [],
  )
  const [error, setError] = useState(false)
  const commit = (steps: string[]) => {
    const next = steps.map((s) => (s.trim() === '' ? NaN : Number(s)))
    if (!definition.isValid(next)) return setError(true)
    setError(false)
    if (JSON.stringify(next) !== JSON.stringify(value)) onSave(next)
  }
  const last = Number(draft[draft.length - 1])
  const canAdd =
    draft.length < control.maxCount &&
    Number.isFinite(last) &&
    last < control.max
  const unit = control.unitKey as Parameters<typeof t>[0]
  return (
    <div className="sv3-num">
      <div className="sv3-num-row">
        {draft.map((step, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            className="sv3-step"
            value={step}
            aria-label={t('settings.goodSteps.step', { n: i + 1 })}
            aria-describedby={descId}
            aria-invalid={error}
            onChange={(e) =>
              setDraft(draft.map((s, j) => (j === i ? e.target.value : s)))
            }
            onBlur={() => commit(draft)}
            onKeyDown={(e) => e.key === 'Enter' && commit(draft)}
          />
        ))}
        <span className="sv3-line-help">{t(unit)}</span>
      </div>
      <div className="sv3-num-row">
        <button
          type="button"
          className="sv3-btn"
          disabled={!canAdd}
          onClick={() => {
            const next = [...draft, String(Math.min(control.max, last * 2))]
            setDraft(next)
            commit(next)
          }}
        >
          + {t('settings.goodSteps.add')}
        </button>
        <button
          type="button"
          className="sv3-btn"
          disabled={draft.length <= 1}
          onClick={() => {
            const next = draft.slice(0, -1)
            setDraft(next)
            commit(next)
          }}
        >
          − {t('settings.goodSteps.remove')}
        </button>
      </div>
      {error && (
        <p role="alert" className="sv3-error">
          {t('settings.error.steps', { min: control.min, max: control.max })}
        </p>
      )}
      <span className="sr-only">{tv('sv3.valueNone')}</span>
    </div>
  )
}
