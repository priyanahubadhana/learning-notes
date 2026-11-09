import { useState } from 'react'
import { t, type MessageKey } from '../../i18n/t'
import { useDeviceSetting } from '../../settings/useSetting'
import {
  readingAlignSetting,
  readingAwakeSetting,
  readingBarSetting,
  readingDimSetting,
} from '../../settings/readingSettings'
import { FontTiles } from './FontTiles'
import { Choices, Shell, Toggle } from './ReadingPanels'
import {
  GOAL_MINUTES,
  goalDays,
  minutesRead,
  readGoalMinutes,
  streakDays,
  writeGoalMinutes,
} from './readingMarks'
import {
  ALIGNS,
  BAR_MODES,
  BLANK_MODES,
  DIM_LEVELS,
  FLOWS,
  LINE_SPACINGS,
  MARGINS,
  READING_THEMES,
  RULERS,
  TEXT_SIZES,
  THEME_COLORS,
  WIDTHS,
} from './readingPrefs'
import { readingLocked, readingView, startReading } from './readingState'
import {
  applyLook,
  PRESET_THEMES,
  removeSavedLook,
  saveCurrentLook,
  savedThemes,
} from './savedThemes'
import type { ReadingSettings } from './useReadingSettings'
import { Icon } from '../tools/icons'

/**
 * The Aa sheet (B1): the reading look in four tabs, the same in the
 * full-screen reader and in place. Font (tiles with a live preview), Layout
 * (size, spacing, margins, width, alignment, scroll or pages), Themes (the
 * colours plus saved looks) and More (line focus, blanks, dim, the reader
 * bar, always open in Reading, lock).
 */

const TABS = ['font', 'layout', 'themes', 'more'] as const
type Tab = (typeof TABS)[number]
const msg = (key: string) => t(key as MessageKey)

export function AaSheet({
  s,
  flags,
  onReadFirst,
  onClose,
}: {
  s: ReadingSettings
  flags: { page: boolean; notebook: boolean }
  onReadFirst: (kind: 'page' | 'notebook', on: boolean) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('font')
  const [align, setAlign] = useDeviceSetting(readingAlignSetting)
  const [dim, setDim] = useDeviceSetting(readingDimSetting)
  const [bar, setBar] = useDeviceSetting(readingBarSetting)
  const [awake, setAwake] = useDeviceSetting(readingAwakeSetting)
  const locked = readingLocked.useValue()
  const saved = savedThemes.useValue()
  const [name, setName] = useState('')
  const opt = <T extends string | number>(id: string, values: readonly T[]) =>
    values.map((value) => ({ value, label: msg(`reading.opt.${id}.${value}`) }))

  return (
    <Shell name="settings" title={t('reading.panel.look')} onClose={onClose}>
      <div
        role="tablist"
        aria-label={t('reading.panel.look')}
        className="mb-3 flex rounded-xl bg-hover"
      >
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-aa-tab={id}
            onClick={() => setTab(id)}
            className={`min-h-11 flex-1 rounded-xl text-sm ${
              tab === id ? 'bg-bg font-semibold text-accent shadow-sm' : ''
            }`}
          >
            {msg(`main.aa.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'font' && (
        <>
          <FontTiles value={s.font} none="app" onPick={s.set.font} />
          <SizeRow s={s} />
        </>
      )}

      {tab === 'layout' && (
        <>
          <Choices
            label={t('settings.reading.spacing.label')}
            value={s.spacing}
            options={opt('spacing', LINE_SPACINGS)}
            onPick={s.set.spacing}
          />
          <Choices
            label={t('settings.reading.margin.label')}
            value={s.margin}
            options={opt('margin', MARGINS)}
            onPick={s.set.margin}
          />
          <Choices
            label={t('settings.reading.width.label')}
            value={s.width}
            options={opt('width', WIDTHS)}
            onPick={s.set.width}
          />
          <Choices
            label={t('settings.reading.align.label')}
            value={align}
            options={opt('align', ALIGNS)}
            onPick={setAlign}
          />
          <Choices
            label={t('settings.reading.flow.label')}
            value={s.flow}
            options={opt('flow', FLOWS)}
            onPick={(flow) => {
              s.set.flow(flow)
              // Pages need the full-screen reader (paged reading cannot
              // work inside the page), so in place it opens.
              if (flow === 'paged' && readingView.get() === 'inPlace') {
                startReading('reader')
              }
            }}
          />
          {s.flow === 'paged' && (
            <p className="-mt-2 mb-3 text-xs text-muted">
              {t('reading.pagesNote')}
            </p>
          )}
        </>
      )}

      {tab === 'themes' && (
        <>
          <Choices
            label={t('settings.reading.theme.label')}
            value={s.theme}
            options={READING_THEMES.map((value) => ({
              value,
              label: msg(`reading.opt.theme.${value}`),
              swatch: value === 'app' ? undefined : THEME_COLORS[value].bg,
            }))}
            onPick={s.set.theme}
          />
          <div className="mb-1 text-xs font-medium text-muted">
            {t('reading.theme.saved')}
          </div>
          <ul className="mb-2 grid gap-1">
            {PRESET_THEMES.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-look={p.id}
                  onClick={() => applyLook(p)}
                  className="min-h-11 w-full rounded-lg border border-line px-3 text-start text-sm hover:bg-hover"
                >
                  {msg(`reading.theme.preset.${p.id}`)}
                </button>
              </li>
            ))}
            {saved.map((look) => (
              <li key={look.name} className="flex gap-1">
                <button
                  type="button"
                  data-look={look.name}
                  onClick={() => applyLook(look)}
                  className="min-h-11 min-w-0 flex-1 truncate rounded-lg border border-line px-3 text-start text-sm hover:bg-hover"
                >
                  {look.name}
                </button>
                <button
                  type="button"
                  aria-label={t('reading.theme.remove', { name: look.name })}
                  onClick={() => removeSavedLook(look.name)}
                  className="grid size-11 place-items-center rounded-lg text-muted hover:bg-hover"
                >
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              saveCurrentLook(name)
              setName('')
            }}
          >
            <input
              value={name}
              maxLength={40}
              aria-label={t('reading.theme.name')}
              placeholder={t('reading.theme.name')}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm"
            />
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-accent px-3 text-sm font-medium text-white"
            >
              {t('reading.theme.saveAs')}
            </button>
          </form>
        </>
      )}

      {tab === 'more' && (
        <>
          <Choices
            label={t('settings.reading.ruler.label')}
            value={s.ruler}
            options={opt('ruler', RULERS)}
            onPick={s.set.ruler}
          />
          <Choices
            label={t('settings.reading.blanks.label')}
            value={s.blanks}
            options={opt('blanks', BLANK_MODES)}
            onPick={s.set.blanks}
          />
          <Choices
            label={t('settings.reading.dim.label')}
            value={dim}
            options={DIM_LEVELS.map((value) => ({
              value: value as number,
              label: `${value}%`,
            }))}
            onPick={setDim}
          />
          <p className="-mt-2 mb-3 text-xs text-muted">
            {t('reading.dimNote')}
          </p>
          <Choices
            label={t('settings.reading.bar.label')}
            value={bar}
            options={opt('bar', BAR_MODES)}
            onPick={setBar}
          />
          <div className="mb-1 flex flex-col gap-1 border-t border-line pt-3">
            <Toggle
              label={t('settings.reading.awake.label')}
              on={awake === 'on'}
              onChange={(on) => setAwake(on ? 'on' : 'off')}
            />
            <Toggle
              label={t('reading.alwaysPage')}
              on={flags.page}
              onChange={(on) => onReadFirst('page', on)}
            />
            <Toggle
              label={t('reading.alwaysNotebook')}
              on={flags.notebook}
              onChange={(on) => onReadFirst('notebook', on)}
            />
            <Toggle
              label={t('reading.lockToReading')}
              on={locked}
              onChange={(on) => readingLocked.set(on)}
            />
          </div>
          <p className="mt-2 text-xs text-muted" data-testid="reading-streak">
            {t('reading.streak', { count: streakDays() })}
          </p>
          <GoalRow />
        </>
      )}
    </Shell>
  )
}

/** The daily reading goal: minutes a day, with today's progress. */
function GoalRow() {
  const [goal, setGoal] = useState(readGoalMinutes)
  const done = minutesRead()
  return (
    <div className="mt-3" data-testid="reading-goal">
      <Choices
        label={t('reading.goal.label')}
        value={goal}
        options={GOAL_MINUTES.map((value) => ({
          value: value as number,
          label:
            value === 0
              ? t('reading.goal.off')
              : t('reading.goal.min', { count: value }),
        }))}
        onPick={(v) => {
          writeGoalMinutes(v)
          setGoal(v)
        }}
      />
      {goal > 0 && (
        <p className="-mt-2 text-xs text-muted" data-testid="reading-goal-note">
          {done >= goal
            ? t('reading.goal.reached')
            : t('reading.goal.progress', { done, goal })}
          {' · '}
          {t('reading.goal.week', { count: goalDays(goal) })}
        </p>
      )}
    </div>
  )
}

function SizeRow({ s }: { s: ReadingSettings }) {
  const step = (delta: 1 | -1) => {
    const i = TEXT_SIZES.indexOf(s.size as (typeof TEXT_SIZES)[number])
    s.set.size(
      TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, i + delta))],
    )
  }
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-medium text-muted">
        {t('settings.reading.size.label')}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('reading.smaller')}
          disabled={s.size <= TEXT_SIZES[0]}
          onClick={() => step(-1)}
          className="min-h-11 min-w-11 rounded-lg border border-line text-lg hover:bg-hover disabled:opacity-40"
        >
          A−
        </button>
        <span
          className="min-w-14 text-center tabular-nums"
          data-testid="reading-size"
        >
          {s.size}%
        </span>
        <button
          type="button"
          aria-label={t('reading.bigger')}
          disabled={s.size >= TEXT_SIZES[TEXT_SIZES.length - 1]}
          onClick={() => step(1)}
          className="min-h-11 min-w-11 rounded-lg border border-line text-lg hover:bg-hover disabled:opacity-40"
        >
          A+
        </button>
      </div>
    </div>
  )
}
