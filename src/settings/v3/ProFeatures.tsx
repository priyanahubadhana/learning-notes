import { use, useId, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { ClearField } from '../../design/parts/ClearField'
import { OnOff } from '../../design/parts/OnOff'
import { SheetBase } from '../../design/parts/SheetBase'
import { PRO_FEATURES, type ProFeatureId } from '../proFeatures.gen'
import {
  getLevel,
  isStoredOn,
  isUnlocked,
  setProOff,
  setUnlocked,
  unlockedIds,
  useLevel,
  useLevelVersion,
} from '../level'
import { markJustShown } from './experience'
import { useSettingsHistory } from './historyCtx'
import { LevelControl } from './LevelControl'
import { proFeatureText } from './proFeatureText'
import { proGroups, type ProGroup } from './proGroups'
import { proOffId, unlockId } from './virtualWrites'
import { WhyLink } from './WhyLink'
import { tv, type V3Key } from './tv'
import { t } from '../../i18n/t'

/** Switches whose part is not built yet (reader-v2.md RD-P34). */
const COMING_LATER: ReadonlySet<string> = new Set([
  'reader.liquid',
  'reader.tapCounts',
])
const nameOf = (id: string) => proFeatureText(id)[0]
const doesOf = (id: string) => proFeatureText(id)[1]

/**
 * Professional features (SET-B37 to B41, B43, B44): every unlock switch in
 * `level.ts`, grouped, searchable, each with its own switch. Turning one on
 * shows the feature at once (the row glows here and in its own section) and
 * the app stays Beginner. "Turn on all in this group" and "Reset to
 * Beginner" are one Undo step each. Professional reads every switch as on
 * and keeps the stored choices for the way back to Beginner.
 */
export function ProFeatures() {
  useLevelVersion()
  const level = useLevel()
  const pro = level === 'professional'
  const history = useSettingsHistory()
  const { toast } = use(AppUiContext)
  const [query, setQuery] = useState('')
  const [glow, setGlow] = useState<{ ids: string[]; seq: number } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const searchId = useId()

  const q = query.trim().toLowerCase()
  const words = q.split(/\s+/).filter(Boolean)
  const matches = (id: string) =>
    words.every((w) => `${nameOf(id)} ${doesOf(id)}`.toLowerCase().includes(w))
  const groups = proGroups(PRO_FEATURES)
    .map((g) => ({ ...g, shown: g.ids.filter(matches) }))
    .filter((g) => g.shown.length > 0)
  const total = PRO_FEATURES.length
  const on = PRO_FEATURES.filter((f) => isUnlocked(f.id)).length

  const flash = (ids: string[]) =>
    setGlow((g) => ({ ids, seq: (g?.seq ?? 0) + 1 }))

  const change = (
    ids: ProFeatureId[],
    next: boolean,
    text: string,
    stored = false,
  ) => {
    // Professional: the level is the default (all on), the switch is a stored override.
    const proNow = !stored && getLevel() === 'professional'
    const items = proNow
      ? ids
          .filter((id) => isUnlocked(id) !== next)
          .map((id) => ({ id: proOffId(id), before: next, after: !next }))
      : ids
          .filter((id) => isStoredOn(id) !== next)
          .map((id) => ({ id: unlockId(id), before: !next, after: next }))
    if (items.length === 0) return
    history.record({ label: text, items }, text)
    for (const id of ids) {
      if (next) markJustShown(id)
      if (proNow) setProOff(id, !next)
      else setUnlocked(id, next)
    }
    flash(ids)
  }

  const resetAll = () => {
    const ids = unlockedIds()
    setConfirm(false)
    if (ids.length === 0) {
      toast(tv('sv3.pro.resetNone'))
      return
    }
    change(ids, false, tv('sv3.pro.resetDone', { count: ids.length }), true)
  }

  return (
    <>
      <p className="sv3-lead">{tv('sv3.pro.lead')}</p>
      <section className="sv3-row" data-setting-id="pro.level">
        <LevelControl />
      </section>
      <div className="sv3-row" data-pro-top data-setting-id="pro.features">
        <ClearField
          id={searchId}
          type="search"
          value={query}
          placeholder={tv('sv3.pro.search')}
          aria-label={tv('sv3.pro.search')}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
        <p className="sv3-line-help" data-pro-total role="status">
          {tv('sv3.pro.countAll', { n: on, total })}
        </p>
        <div className="sv3-tour-actions">
          <button
            type="button"
            className="sv3-btn"
            data-pro-reset
            onClick={() => setConfirm(true)}
          >
            {tv('sv3.pro.reset')}
          </button>
          <WhyLink id="reset-beginner" title={tv('sv3.pro.reset')}>
            <p>{tv('sv3.pro.resetWhy')}</p>
          </WhyLink>
        </div>
        {pro && (
          <p className="sv3-line-help" data-pro-note>
            {tv('sv3.pro.proNote')}
          </p>
        )}
      </div>
      {groups.length === 0 && (
        <p role="status" data-pro-empty className="sv3-line-help">
          {tv('sv3.pro.none')}
        </p>
      )}
      {groups.map((g) => (
        <GroupCard
          key={g.slug}
          group={g}
          ids={g.shown}
          glow={glow}
          onToggle={(id, next) =>
            change(
              [id],
              next,
              tv(next ? 'sv3.pro.toastOn' : 'sv3.pro.toastOff', {
                name: nameOf(id),
              }),
            )
          }
          onAll={(next) =>
            change(
              g.ids,
              next,
              tv(next ? 'sv3.pro.groupOn' : 'sv3.pro.groupOff', {
                group: tv(`sv3.group.${g.slug}` as V3Key),
              }),
            )
          }
        />
      ))}
      {confirm && (
        <SheetBase
          title={tv('sv3.pro.reset')}
          onClose={() => setConfirm(false)}
          data-testid="sv3-pro-reset-dialog"
          footer={
            <>
              <button
                type="button"
                className="sv3-btn"
                onClick={() => setConfirm(false)}
              >
                {tv('sv3.cancel')}
              </button>
              <button
                type="button"
                className="sv3-btn sv3-btn-primary"
                data-autofocus=""
                data-pro-reset-confirm
                onClick={resetAll}
              >
                {tv('sv3.pro.resetConfirm')}
              </button>
            </>
          }
        >
          <p>{tv('sv3.pro.resetAsk', { count: unlockedIds().length })}</p>
        </SheetBase>
      )}
    </>
  )
}

function GroupCard({
  group,
  ids,
  glow,
  onToggle,
  onAll,
}: {
  group: ProGroup
  ids: readonly ProFeatureId[]
  glow: { ids: string[]; seq: number } | null
  onToggle(id: ProFeatureId, next: boolean): void
  onAll(next: boolean): void
}) {
  const all = group.ids
  const onCount = all.filter((id) => isUnlocked(id)).length
  const allOn = onCount === all.length
  const name = tv(`sv3.group.${group.slug}` as V3Key)
  return (
    <section
      data-pro-group={group.slug}
      aria-labelledby={`sv3-pro-${group.slug}`}
      className="sv3-prog"
    >
      <header className="sv3-prog-head">
        <h3 id={`sv3-pro-${group.slug}`} className="sv3-row-name">
          {name}{' '}
          <span className="sv3-tag" data-pro-count>
            {tv('sv3.pro.count', { n: onCount, total: all.length })}
          </span>
        </h3>
        <button
          type="button"
          className="sv3-btn"
          data-pro-all
          aria-label={
            tv(allOn ? 'sv3.pro.allOff' : 'sv3.pro.allOn') + ': ' + name
          }
          onClick={() => onAll(!allOn)}
        >
          {tv(allOn ? 'sv3.pro.allOff' : 'sv3.pro.allOn')}
        </button>
      </header>
      <ul className="sv3-prog-list">
        {ids.map((id) => {
          const later = COMING_LATER.has(id)
          const checked = !later && isUnlocked(id)
          return (
            <li
              key={glow?.ids.includes(id) ? `${id}:${glow.seq}` : id}
              data-pro-feature={id}
              data-glow={glow?.ids.includes(id) ? 'on' : undefined}
              className="sv3-prof"
            >
              <div className="sv3-prof-text">
                <span className="sv3-row-name">{nameOf(id)}</span>
                <span className="sv3-line-help">{doesOf(id)}</span>
                {later && (
                  <span className="sv3-line-help" data-coming-later>
                    {t('readerv2.comingLater')}
                  </span>
                )}
              </div>
              <OnOff
                checked={checked}
                label={nameOf(id)}
                disabled={later}
                onChange={(next) => onToggle(id, next)}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
