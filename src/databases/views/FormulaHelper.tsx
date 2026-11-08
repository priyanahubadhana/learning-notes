import type { DbColumn } from '../../core/types'
import { t } from '../../i18n/t'
import { FORMULA_FUNCTIONS } from '../formula/formulaEval'

/**
 * Under the advanced formula box: buttons that add a column name
 * (`[Name]`) or a function (`NAME(`) to the end of the formula, so nobody
 * has to remember the spelling. Functions are the fixed list the evaluator
 * knows; a formula is never run as code.
 */
export function FormulaHelper({
  columns,
  titleName,
  onInsert,
}: {
  columns: readonly DbColumn[]
  titleName: string
  onInsert: (text: string) => void
}) {
  const chip =
    'min-h-8 rounded-md border border-line px-2 text-[12px] hover:border-accent hover:text-accent'
  return (
    <details className="mb-3 text-xs text-muted">
      <summary className="min-h-8 cursor-pointer py-1.5">
        {t('formula.helper')}
      </summary>
      <p className="mb-1">{t('formula.helper.columns')}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {[titleName, ...columns.map((c) => c.name)].map((name) => (
          <button
            key={name}
            type="button"
            className={chip}
            onClick={() => onInsert(`[${name}]`)}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="mb-1">{t('formula.helper.functions')}</p>
      <div className="flex flex-wrap gap-1.5">
        {FORMULA_FUNCTIONS.map((fn) => (
          <button
            key={fn}
            type="button"
            className={`${chip} font-mono`}
            onClick={() => onInsert(`${fn}(`)}
          >
            {fn}
          </button>
        ))}
      </div>
    </details>
  )
}
