import { t } from '../../i18n/t'
import { localDay } from '../formula/formulaValue'
import { studyStreak, type ReviewHistory } from '../trackerHistory'
import {
  HEAT_WEEKS,
  periodStart,
  previousPeriod,
  utcDay,
  dayAt,
  DAY_MS,
  MAX_POINTS,
  type ChartData,
  type HeatDay,
} from './chartData'
import type { ChartSpec } from './chartSpec'

/**
 * Study tracker charts drawn from the review history instead of from the
 * rows: % correct per week (line), answers per day (heatmap) and the
 * study streak (number).
 */
export function historyData(
  spec: ChartSpec,
  history: ReviewHistory,
  now: number,
): ChartData {
  const today = localDay(now)
  const answers = [...history.values()].reduce((n, d) => n + d.answered, 0)

  if (spec.history === 'streak') {
    const { current, best } = studyStreak(history, now)
    return {
      kind: 'number',
      value: current,
      rows: answers,
      note: t('tracker.streak.best', { count: best }),
    }
  }

  if (spec.history === 'days') {
    const first = dayAt(
      utcDay(periodStart(today, 'week')) - (HEAT_WEEKS - 1) * 7 * DAY_MS,
    )
    const days: HeatDay[] = []
    let max = 0
    let total = 0
    for (
      let i = 0, day = first;
      i < HEAT_WEEKS * 7;
      i++, day = dayAt(utcDay(day) + DAY_MS)
    ) {
      const value = history.get(day)?.answered ?? 0
      days.push({ day, value, future: day > today })
      if (value > max) max = value
      total += value
    }
    return { kind: 'heatmap', days, max, total, rows: total }
  }

  // % correct per week, from the first week with answers (up to 12 weeks).
  const weeks = new Map<string, { answered: number; correct: number }>()
  for (const [day, count] of history) {
    const key = periodStart(day, 'week')
    const week = weeks.get(key) ?? { answered: 0, correct: 0 }
    week.answered += count.answered
    week.correct += count.correct
    weeks.set(key, week)
  }
  const latest = periodStart(today, 'week')
  const earliest = [...weeks.keys()].sort()[0] ?? latest
  const keys: string[] = []
  for (let k = latest; keys.length < MAX_POINTS.week;) {
    keys.unshift(k)
    if (k <= earliest) break
    k = previousPeriod(k, 'week')
  }
  const points = keys.map((key) => {
    const week = weeks.get(key)
    return {
      key,
      day: key,
      value: week && week.answered > 0 ? week.correct / week.answered : null,
      rows: week?.answered ?? 0,
    }
  })
  return { kind: 'series', points, period: 'week', rows: answers }
}
