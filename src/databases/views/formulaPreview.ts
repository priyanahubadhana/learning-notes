import type { DbColumn } from '../../core/types'
import { currentLocale, t } from '../../i18n/t'
import { cellText } from '../cellDisplay'
import { resolveRows, type DatabaseData } from '../databaseQuery'
import { titleColumnName } from '../databaseService'
import { formulaReferences } from '../formula/formulaParser'
import { isBlank, isError, type FValue } from '../formula/formulaValue'

/** A column the formula reads, with its value in the preview row. */
export interface PreviewInput {
  name: string
  column: DbColumn | null
  value: FValue
}

export interface FormulaPreview {
  title: string
  value: FValue
  inputs: PreviewInput[]
}

/** Id of the stand-in column a new formula is tried out in. */
const PREVIEW_ID = 'formula-preview'

/**
 * Works a formula out for the first row, as it would show in the table
 * (before it is saved). `columnId` is the formula column being edited, or
 * undefined for a new one. Null when the database has no rows yet.
 */
export function previewFormula(
  data: DatabaseData,
  formula: string,
  now: number,
  columnId?: string,
): FormulaPreview | null {
  const main = data.databases.get(data.databaseId)
  if (!main || main.rows.length === 0) return null
  const id = columnId ?? PREVIEW_ID
  const base = main.columns.find((c) => c.id === columnId)
  const probe: DbColumn = {
    id,
    databaseId: main.database.id,
    name: base?.name ?? '',
    type: 'formula',
    config: { formula },
    order: base?.order ?? '~',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  }
  const columns = base
    ? main.columns.map((c) => (c.id === id ? probe : c))
    : [...main.columns, probe]
  // Only the first row is needed: a copy with just that row is quicker.
  const databases = new Map(data.databases)
  databases.set(data.databaseId, {
    ...main,
    columns,
    rows: main.rows.slice(0, 1),
  })
  const [row] = resolveRows({ ...data, databases }, now)
  const title = titleColumnName(main.database)
  const inputs = formulaReferences(formula).flatMap((name): PreviewInput[] => {
    const lower = name.toLocaleLowerCase()
    if (title.toLocaleLowerCase() === lower) {
      return [{ name: title, column: null, value: row.page.title }]
    }
    const column = main.columns.find(
      (c) => c.name.toLocaleLowerCase() === lower && c.id !== id,
    )
    return column
      ? [{ name: column.name, column, value: row.values[column.id] ?? null }]
      : []
  })
  return { title: row.page.title, value: row.values[id] ?? null, inputs }
}

/** A value as it reads in a sentence: "3 stars", "75%", "Done". */
function said(value: FValue, column: DbColumn | null) {
  if (
    typeof value === 'number' &&
    column?.type === 'number' &&
    column.config.format === 'stars'
  ) {
    return t('table.stars', { count: value })
  }
  return cellText(value, column ?? undefined)
}

/**
 * The preview in words, with what the formula read: "For “Heart sounds”,
 * Confidence is 3 stars, so it writes Redo." An empty input that leaves
 * the answer blank says so: "“Heart sounds” has no Confidence yet …".
 */
export function previewSentence(preview: FormulaPreview): string {
  const row = preview.title || t('review.untitled')
  const { value, inputs } = preview
  if (isError(value)) {
    return t('column.preview.error', { row, error: cellText(value) })
  }
  const blank = isBlank(value)
  const missing = inputs.find((input) => isBlank(input.value))
  if (blank && missing) {
    return t('column.preview.missing', { row, column: missing.name })
  }
  const shown = inputs.slice(0, 3).map((input) =>
    isBlank(input.value)
      ? t('column.preview.inputEmpty', { column: input.name })
      : t('column.preview.input', {
          column: input.name,
          value: said(input.value, input.column),
        }),
  )
  const read = new Intl.ListFormat(currentLocale(), { type: 'conjunction' })
  const result = said(value, null)
  if (shown.length === 0) {
    return blank
      ? t('column.preview.nothing', { row })
      : t('column.preview.writes', { row, result })
  }
  const inputsText = read.format(shown)
  return blank
    ? t('column.preview.readNothing', { row, inputs: inputsText })
    : t('column.preview.readWrites', { row, inputs: inputsText, result })
}
