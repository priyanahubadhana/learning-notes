import type { LearningNotesDB } from '../../../core/db'
import type { JsonValue } from '../../../core/types'
import { SPACES, SPACE_ICON, type Space } from '../../../app/spaces/spaces'
import { currentLocale } from '../../../i18n/t'
import type { Change } from '../changeNote'
import { tv } from '../tv'
import { useSettingValues } from '../useSettingValues'

/** The General settings the mini app shows, each next to the part it changes. */
const IDS = [
  'general.theme',
  'general.reduceGlass',
  'general.dateStyle',
  'general.language',
  'general.showHelp',
  'general.deviceMode',
  'general.pathStyle',
  'general.autoUpdate',
  'general.defaultPaper',
  'general.space.home',
  'general.space.library',
  'general.space.review',
] as const

/** Which part of the mini app each setting changes (the part that glows). */
const PART: Record<string, string> = {
  'general.theme': 'app',
  'general.reduceGlass': 'bar',
  'general.dateStyle': 'date',
  'general.language': 'lang',
  'general.showHelp': 'tip',
  'general.deviceMode': 'device',
  'general.pathStyle': 'path',
  'general.autoUpdate': 'update',
  'general.defaultPaper': 'paper',
  'general.space.home': 'rail',
  'general.space.library': 'rail',
  'general.space.review': 'rail',
}

const SAMPLE = new Date(2026, 9, 27)

const dateText = (style: JsonValue | undefined) => {
  const locale =
    style === 'dayFirst'
      ? 'en-GB'
      : style === 'monthFirst'
        ? 'en-US'
        : currentLocale()
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(SAMPLE)
}

/**
 * SET-B08: a mini app that shows the effect of the General settings at once:
 * theme, paper, reduce glass, date style, language, device mode, path style,
 * the update chip and hidden spaces in the rail. It draws with the app's own
 * tokens (the theme applies as soon as it is chosen) and reads the same stored
 * values as the rows. The part that just changed glows.
 */
export function GeneralPreview({
  db,
  last,
}: {
  db: LearningNotesDB
  last: Change | null
}) {
  const v = useSettingValues(db, IDS)
  const glow = (part: string) =>
    last && PART[last.id] === part ? 'on' : undefined
  const key = (part: string) => (glow(part) ? last!.seq : 0)
  const hidden = (s: Space) => v[`general.space.${s}`] === 'hide'
  const lang =
    typeof v['general.language'] === 'string'
      ? v['general.language']
      : undefined
  const solid = v['general.reduceGlass'] === 'reduce'
  const paper = String(v['general.defaultPaper'] ?? 'blank')
  const helpOn = v['general.showHelp'] !== 'off'
  const updateChip = v['general.autoUpdate'] === 'off'
  const pathOn = v['general.pathStyle'] !== 'off'

  return (
    <div
      data-general-preview
      data-glow={glow('app')}
      key={`app${key('app')}`}
      className="sv3-mini"
    >
      <div
        className="sv3-mini-rail"
        data-glow={glow('rail')}
        key={`r${key('rail')}`}
      >
        {SPACES.filter((s) => !hidden(s)).map((s) => {
          const Icon = SPACE_ICON[s]
          return (
            <span key={s} data-rail-space={s} className="sv3-mini-dot">
              <Icon size={14} aria-hidden />
            </span>
          )
        })}
      </div>
      <div className="sv3-mini-main">
        <div
          className="sv3-mini-bar"
          data-solid={solid ? '' : undefined}
          data-glow={glow('bar')}
          key={`b${key('bar')}`}
        >
          {pathOn && (
            <span
              data-glow={glow('path')}
              key={`p${key('path')}`}
              className="sv3-mini-chip"
            >
              {String(v['general.pathStyle'] ?? 'simple') === 'full'
                ? tv('sv3.miniPath')
                : tv('sv3.miniPage')}
            </span>
          )}
          <span
            data-glow={glow('device')}
            key={`d${key('device')}`}
            className="sv3-mini-chip"
          >
            {String(v['general.deviceMode'] ?? '')}
          </span>
          {updateChip && (
            <span
              data-glow={glow('update')}
              key={`u${key('update')}`}
              className="sv3-mini-chip"
              data-update
            >
              {tv('sv3.miniUpdate')}
            </span>
          )}
        </div>
        <div
          className="sv3-mini-page"
          data-paper={paper}
          data-glow={glow('paper')}
          key={`g${key('paper')}`}
        >
          <span
            data-glow={glow('date')}
            key={`t${key('date')}`}
            className="sv3-mini-date"
          >
            {dateText(v['general.dateStyle'])}
          </span>
          <span
            data-glow={glow('lang')}
            key={`l${key('lang')}`}
            className="sv3-mini-text"
            lang={lang}
          >
            {tv('sv3.langRead', undefined, lang)}
          </span>
          <span
            data-glow={glow('tip')}
            key={`h${key('tip')}`}
            className="sv3-mini-tip"
            data-off={helpOn ? undefined : ''}
          >
            {helpOn ? tv('sv3.miniTip') : tv('sv3.miniTipOff')}
          </span>
        </div>
      </div>
    </div>
  )
}
