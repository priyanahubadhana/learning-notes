import { describe, expect, it } from 'vitest'
import type { Database, DbColumn, JsonObject, Page } from '../../core/types'
import { TITLE_COLUMN_ID } from '../columnTypes'
import type { ResolvedRow } from '../databaseQuery'
import type { FValue } from '../formula/formulaValue'
import { chartData, HEAT_WEEKS, periodStart } from './chartData'
import {
  chartTitle,
  knownChart,
  newChart,
  readCharts,
  suggestCharts,
  withCharts,
  type ChartSpec,
} from './chartSpec'

const column = (id: string, type: string, config: JsonObject = {}) =>
  ({ id, name: id[0].toUpperCase() + id.slice(1), type, config }) as DbColumn

const status = column('status', 'choice', {
  options: [
    { id: 'a', name: 'To do', color: '#2f6feb' },
    { id: 'b', name: 'Doing' },
    { id: 'c', name: 'Done', color: '#2e9e6b' },
  ],
})
const price = column('price', 'number')
const rating = column('rating', 'number', { format: 'stars', max: 5 })
const done = column('done', 'checkbox')
const when = column('when', 'date')
const labels = column('labels', 'choices', {
  options: [
    { id: 'x', name: 'Red' },
    { id: 'y', name: 'Blue' },
  ],
})
const columns = [status, price, rating, done, when, labels]

let n = 0
function row(
  values: Record<string, FValue>,
  title = `Row ${++n}`,
): ResolvedRow {
  return {
    page: { id: `p${n}`, title } as Page,
    values: { [TITLE_COLUMN_ID]: title, ...values },
    links: {},
  }
}

const rows = [
  row(
    {
      status: 'To do',
      price: 10,
      done: true,
      when: { date: '2026-10-26' },
      labels: ['Red', 'Blue'],
    },
    'A',
  ),
  row(
    {
      status: 'Done',
      price: 5,
      rating: 4,
      when: { date: '2026-10-20' },
      labels: ['Red'],
    },
    'B',
  ),
  row(
    { status: 'Done', price: null, rating: 2, when: { date: '2026-10-26' } },
    'C',
  ),
  row({ status: null, price: 'n/a', done: false }, 'D'),
]
// Tuesday 27 Oct 2026, noon local time.
const NOW = new Date(2026, 9, 27, 12).getTime()

const spec = (s: Partial<ChartSpec>): ChartSpec => ({
  id: 'c1',
  kind: 'number',
  title: '',
  size: 'small',
  measure: 'count',
  ...s,
})

describe('chart numbers', () => {
  it('counts rows, and adds up / averages numbers only', () => {
    expect(chartData(spec({}), rows, columns, NOW)).toEqual({
      kind: 'number',
      value: 4,
      rows: 4,
    })
    const of = (measure: ChartSpec['measure'], valueColumnId = 'price') =>
      chartData(spec({ measure, valueColumnId }), rows, columns, NOW)
    expect(of('sum')).toMatchObject({ value: 15 })
    expect(of('average')).toMatchObject({ value: 7.5 })
    expect(of('min')).toMatchObject({ value: 5 })
    expect(of('max')).toMatchObject({ value: 10 })
    expect(of('average', 'rating')).toMatchObject({ value: 3 })
  })

  it('has nothing to average when no row has a number', () => {
    const none = [row({ price: null })]
    expect(
      chartData(
        spec({ measure: 'average', valueColumnId: 'price' }),
        none,
        columns,
        NOW,
      ),
    ).toMatchObject({ value: null })
    expect(
      chartData(
        spec({ measure: 'sum', valueColumnId: 'price' }),
        none,
        columns,
        NOW,
      ),
    ).toMatchObject({ value: 0 })
  })

  it("applies the chart's own filter", () => {
    const only = spec({ filter: { columnId: 'status', op: 'is', value: 'c' } })
    expect(chartData(only, rows, columns, NOW)).toMatchObject({ value: 2 })
    const ticked = spec({ filter: { columnId: 'done', op: 'isChecked' } })
    expect(chartData(ticked, rows, columns, NOW)).toMatchObject({ value: 1 })
  })
})

describe('chart groups', () => {
  it('keeps Choice options in order, with colours, and empty last', () => {
    const data = chartData(
      spec({ kind: 'bar', groupColumnId: 'status' }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'groups') throw new Error()
    expect(
      data.groups.map((g) => [g.label, g.value, g.color, g.special]),
    ).toEqual([
      ['To do', 1, '#2f6feb', undefined],
      ['Doing', 0, undefined, undefined],
      ['Done', 2, '#2e9e6b', undefined],
      ['', 1, undefined, 'empty'],
    ])
  })

  it('leaves out empty slices for parts of a whole', () => {
    const data = chartData(
      spec({ kind: 'donut', groupColumnId: 'status' }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'groups') throw new Error()
    expect(data.groups.map((g) => g.label)).toEqual(['To do', 'Done', ''])
  })

  it('puts a row with several choices in each group', () => {
    const data = chartData(
      spec({ kind: 'bar', groupColumnId: 'labels' }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'groups') throw new Error()
    expect(data.groups.map((g) => [g.label, g.value])).toEqual([
      ['Red', 2],
      ['Blue', 1],
      ['', 2],
    ])
  })

  it('groups ticks and sums per group', () => {
    const data = chartData(
      spec({
        kind: 'bar',
        groupColumnId: 'done',
        measure: 'sum',
        valueColumnId: 'price',
      }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'groups') throw new Error()
    expect(data.groups.map((g) => [g.key, g.value])).toEqual([
      ['true', 10],
      ['false', 5],
    ])
  })

  it('draws one bar per row, biggest first, and counts the rest', () => {
    const many = Array.from({ length: 15 }, (_, i) => row({ price: i }))
    const data = chartData(
      spec({
        kind: 'bar',
        groupColumnId: TITLE_COLUMN_ID,
        measure: 'sum',
        valueColumnId: 'price',
      }),
      many,
      columns,
      NOW,
    )
    if (data.kind !== 'groups') throw new Error()
    expect(data.groups).toHaveLength(12)
    expect(data.groups[0].value).toBe(14)
    expect(data.more).toBe(3)
  })

  it('folds small groups into Other (measured again over their rows)', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      row({ status: null, price: i, labels: [`L${i}`] }),
    )
    const data = chartData(
      spec({
        kind: 'donut',
        groupColumnId: 'labels',
        measure: 'average',
        valueColumnId: 'price',
      }),
      many,
      [column('labels', 'text'), price],
      NOW,
    )
    if (data.kind !== 'groups') throw new Error()
    expect(data.groups).toHaveLength(6)
    const other = data.groups[5]
    expect(other.special).toBe('other')
    expect(other.rows).toBe(4)
    expect(other.value).toBe((3 + 2 + 1 + 0) / 4)
  })
})

describe('charts over time', () => {
  it('starts weeks on Monday and months on the 1st', () => {
    expect(periodStart('2026-10-27', 'week')).toBe('2026-10-26')
    expect(periodStart('2026-11-01', 'week')).toBe('2026-10-26')
    expect(periodStart('2026-10-27', 'month')).toBe('2026-10-01')
  })

  it('places rows per week, from the first week with data to this week', () => {
    const data = chartData(
      spec({ kind: 'line', dateColumnId: 'when', period: 'week' }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'series') throw new Error()
    expect(data.points.map((p) => [p.day, p.value])).toEqual([
      ['2026-10-19', 1],
      ['2026-10-26', 2],
    ])
    expect(data.rows).toBe(3)
  })

  it('leaves gaps for averages, zeros for counts', () => {
    const data = chartData(
      spec({
        kind: 'line',
        dateColumnId: 'when',
        period: 'day',
        measure: 'average',
        valueColumnId: 'rating',
      }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'series') throw new Error()
    expect(data.points[0]).toMatchObject({ day: '2026-10-20', value: 4 })
    expect(data.points[1]).toMatchObject({ day: '2026-10-21', value: null })
    expect(data.points.at(-1)).toMatchObject({ day: '2026-10-27', value: null })
  })

  it('keeps at most 12 weeks', () => {
    const old = [row({ when: { date: '2025-01-01' } })]
    const data = chartData(
      spec({ kind: 'line', dateColumnId: 'when', period: 'week' }),
      old,
      columns,
      NOW,
    )
    if (data.kind !== 'series') throw new Error()
    expect(data.points).toHaveLength(12)
    expect(data.points.at(-1)!.day).toBe('2026-10-26')
  })

  it('fills a heatmap of whole weeks ending this week', () => {
    const data = chartData(
      spec({ kind: 'heatmap', dateColumnId: 'when' }),
      rows,
      columns,
      NOW,
    )
    if (data.kind !== 'heatmap') throw new Error()
    expect(data.days).toHaveLength(HEAT_WEEKS * 7)
    expect(data.days.at(-1)).toMatchObject({ day: '2026-11-01', future: true })
    expect(data.days.find((d) => d.day === '2026-10-26')!.value).toBe(2)
    expect(data).toMatchObject({ max: 2, total: 3 })
  })
})

describe('chart settings', () => {
  const database = { titleName: 'Name' } as Database

  it('reads saved charts safely and saves them back', () => {
    const saved = withCharts({ sorts: [] }, [
      spec({ kind: 'bar', groupColumnId: 'status' }),
    ])
    expect(saved.sorts).toEqual([])
    expect(readCharts(saved)).toEqual([
      spec({ kind: 'bar', groupColumnId: 'status' }),
    ])
    expect(readCharts({})).toBeNull()
    const damaged = {
      charts: [
        { id: 'x', kind: 'pie' },
        'oops',
        {
          id: 'y',
          kind: 'line',
          size: 'huge',
          measure: 'median',
          period: 'year',
        },
      ],
    }
    expect(readCharts(damaged)).toEqual([
      {
        id: 'y',
        kind: 'line',
        title: '',
        size: 'small',
        measure: 'count',
        period: 'week',
      },
    ])
  })

  it('drops columns that were deleted', () => {
    const chart = knownChart(
      spec({ measure: 'sum', valueColumnId: 'gone', groupColumnId: 'gone2' }),
      columns,
    )
    expect(chart).toEqual(spec({}))
  })

  it('suggests starter charts from the columns', () => {
    const kinds = suggestCharts(columns).map((c) => [
      c.kind,
      c.measure,
      c.valueColumnId ?? c.groupColumnId ?? c.dateColumnId,
    ])
    expect(kinds).toEqual([
      ['number', 'count', undefined],
      ['number', 'sum', 'price'],
      ['number', 'average', 'rating'],
      ['donut', 'count', 'status'],
      ['bar', 'sum', 'price'],
      ['progress', 'count', 'status'],
      ['heatmap', 'count', 'when'],
    ])
    expect(suggestCharts([]).map((c) => c.kind)).toEqual(['number'])
  })

  it('fills a new chart with fitting columns', () => {
    expect(newChart('donut', columns)).toMatchObject({
      groupColumnId: 'status',
      size: 'medium',
    })
    expect(newChart('bar', [price])).toMatchObject({
      groupColumnId: TITLE_COLUMN_ID,
      measure: 'sum',
      valueColumnId: 'price',
    })
    expect(newChart('line', columns)).toMatchObject({
      dateColumnId: 'when',
      period: 'week',
    })
  })

  it('works out titles from the settings', () => {
    const title = (s: Partial<ChartSpec>) =>
      chartTitle(spec(s), columns, database)
    expect(title({})).toBe('Rows')
    expect(title({ title: ' Mine ' })).toBe('Mine')
    expect(title({ kind: 'donut', groupColumnId: 'status' })).toBe(
      'Rows by Status',
    )
    expect(
      title({
        kind: 'bar',
        measure: 'sum',
        valueColumnId: 'price',
        groupColumnId: TITLE_COLUMN_ID,
      }),
    ).toBe('Sum of Price by Name')
    expect(
      title({
        kind: 'line',
        period: 'month',
        dateColumnId: 'when',
        measure: 'average',
        valueColumnId: 'rating',
      }),
    ).toBe('Average of Rating per month (When)')
    expect(title({ kind: 'heatmap', dateColumnId: 'when' })).toBe(
      'Rows per day (When)',
    )
  })
})
