import { Fragment, useEffect, useRef, useState } from 'react'
import { revealWhenReady } from '../../editor/revealBlock'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { pushRouteParts, useRouteParts } from '../../app/router'
import { settingsRegistry } from '../builtinSettings'
import '../toolbarSettings'
import '../spaceSettings'
import '../labSettings'
import '../flagSettings'
import '../readingSettings'
import '../lockSettings'
import '../../ai/aiSettings'
import '../../connector/claudeSettings'
import '../../sync/syncSettings'
import '../accountSettings'
import { Icon } from '../../app/tools/icons'
import { SettingsHistoryProvider } from './HistoryContext'
import { useSettingsHistory } from './historyCtx'
import { SectionReset } from './SectionReset'
import { PreviewPane } from './PreviewPane'
import { PreviewPill } from './PreviewPill'
import { SettingRow } from './SettingRow'
import type { Change } from './changeNote'
import { ClearField } from '../../design/parts/ClearField'
import { SearchResults } from './SearchResults'
import { searchSettings } from './settingsSearch'
import { SectionList } from './SectionList'
import { PageTabsEditor } from './PageTabsEditor'
import { buildSections } from './sections'
import { ExperienceSection } from './ExperienceSection'
import { HelpSection } from './HelpSection'
import { ProFeatures } from './ProFeatures'
import { rowShown, useExperienceOnTop } from './experience'
import { searchVirtual, virtualRows } from './virtualRows'
import { asksForTryNew, openTryNew, useTryNewOpen } from './tryNew'
import { TryNewHeader } from './TryNewHeader'
import { inSection, useVisibleSettings } from './visibleSettings'
import { tv } from './tv'
import { useWide } from './useWide'
import './settingsV3.css'

/**
 * Settings v3 (flag `settings.v3`): a list of sections on the left (a chip row
 * on a phone), the settings in the middle and a sticky preview on the right
 * (a pill and a sheet below 1180 px wide). It reads the same settings registry
 * and the same stored values as today's screen; nothing is copied.
 */
export function SettingsV3(props: { db: LearningNotesDB; focusId?: string }) {
  return (
    <SettingsHistoryProvider db={props.db}>
      <SettingsV3Body {...props} />
    </SettingsHistoryProvider>
  )
}

function SettingsV3Body({
  db,
  focusId,
}: {
  db: LearningNotesDB
  focusId?: string
}) {
  const top = useExperienceOnTop()
  const tryOpen = useTryNewOpen()
  const sections = buildSections(top, tryOpen)
  const history = useSettingsHistory()
  const [own, setOwn] = useState(
    () =>
      (focusId?.startsWith('category:') && focusId.slice(9)) ||
      (focusId?.includes('/') && focusId.split('/')[0]) ||
      (focusId && settingsRegistry.get(focusId)?.category) ||
      sections[0]?.id ||
      '',
  )
  const fromAddress = useRouteParts(0)
  const current =
    fromAddress && sections.some((s) => s.id === fromAddress)
      ? fromAddress
      : own
  const pick = (id: string) => {
    setOwn(id)
    pushRouteParts(0, id, [current])
  }

  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusId) return
    revealWhenReady(
      () =>
        root.current?.querySelector<HTMLElement>(
          `[data-setting-id="${CSS.escape(focusId.split('/').pop() ?? focusId)}"]`,
        ) ?? null,
    )
  }, [focusId])

  const everything = useVisibleSettings(db, true).filter(
    (s) => tryOpen || s.category !== 'tryNew',
  )
  const visible = everything.filter((s) => !s.searchOnly)
  const items = sections.map((s) => ({
    id: s.id,
    label: s.label,
    count: s.kind === 'rows' ? inSection(visible, s.id).length : undefined,
  }))
  const section = sections.find((s) => s.id === current)
  const rows =
    section?.kind === 'rows' || section?.kind === 'help'
      ? inSection(visible, current)
      : []
  const [moved, setMoved] = useState<string | undefined>(undefined)
  // The page tabs sit after the space switches (or last when those are hidden).
  const tabsAfter =
    current === 'general' && rowShown('general.pageTabs')
      ? (rows.find((r) => r.id === 'general.space.review') ?? rows.at(-1))?.id
      : undefined

  // SET-B05 / B06: search every section; a result opens its row and it glows.
  const [query, setQuery] = useState('')
  const [jump, setJump] = useState<{ id: string; seq: number } | null>(null)
  const searching = query.trim() !== ''
  const vhits = searching ? searchVirtual(virtualRows(), query) : []
  const hits = searching
    ? searchSettings(everything, query, (s) => ({
        name: t(s.labelKey).toLowerCase(),
        help: t(s.descriptionKey).toLowerCase(),
        keywords: (s.keywords ?? '').toLowerCase(),
      }))
    : []
  const openHit = (settingId: string, sectionId: string) => {
    setQuery('')
    pick(sectionId)
    setJump((j) => ({ id: settingId, seq: (j?.seq ?? 0) + 1 }))
    revealWhenReady(
      () =>
        root.current?.querySelector<HTMLElement>(
          `[data-setting-id="${CSS.escape(settingId)}"]`,
        ) ?? null,
    )
  }

  // The phone preview: open or shut, and how many changes it has not shown.
  const wide = useWide(root)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [unseen, setUnseen] = useState(0)
  const toggleSheet = () => {
    setSheetOpen((o) => !o)
    setUnseen(0)
  }
  const [last, setLast] = useState<Change | null>(null)
  const changed = (c: Omit<Change, 'seq'>) => {
    setUnseen((n) => n + 1)
    setLast((l) => ({ ...c, seq: (l?.seq ?? 0) + 1 }))
  }

  return (
    <div
      ref={root}
      data-settings-v3
      data-wide={wide ? '' : undefined}
      className="sv3"
    >
      <div className="sv3-titlebar">
        <h1 className="sv3-title">{tv('sv3.title')}</h1>
        <div
          role="group"
          aria-label={t('main.history')}
          className="sv3-history"
        >
          <button
            type="button"
            data-testid="sv3-undo"
            aria-label={t('tool.undo')}
            disabled={!history.canUndo}
            onClick={history.undo}
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            data-testid="sv3-redo"
            aria-label={t('tool.redo')}
            disabled={!history.canRedo}
            onClick={history.redo}
          >
            <Icon name="redo" />
          </button>
        </div>
      </div>
      <div className="sv3-search">
        <ClearField
          type="search"
          value={query}
          placeholder={tv('sv3.search')}
          aria-label={tv('sv3.search')}
          onChange={(e) => {
            const text = e.target.value
            // SET-B26: the phrase opens the hidden list.
            if (asksForTryNew(text)) {
              openTryNew()
              setQuery('')
              pick('tryNew')
              setMoved('tryNew')
              setTimeout(() => setMoved(undefined), 3000)
              return
            }
            setQuery(text)
          }}
          onClear={() => setQuery('')}
        />
      </div>
      <div className="sv3-cols">
        <SectionList
          sections={items}
          current={current}
          onPick={pick}
          glow={moved}
        />
        <section className="sv3-main" aria-label={section?.label}>
          {searching && (
            <SearchResults
              hits={hits}
              virtuals={vhits}
              sectionName={(id) =>
                sections.find((x) => x.id === id)?.label ?? id
              }
              query={query.trim()}
              onOpen={openHit}
            />
          )}
          {!searching &&
            (section?.kind === 'rows' || section?.kind === 'help') &&
            section.lead && <p className="sv3-lead">{section.lead}</p>}
          {!searching && section?.kind === 'experience' && (
            <ExperienceSection
              onMoved={() => {
                setMoved('experience')
                setTimeout(() => setMoved(undefined), 3000)
              }}
            />
          )}
          {!searching && section?.kind === 'pro' && <ProFeatures />}
          {!searching && current === 'tryNew' && <TryNewHeader />}
          {!searching &&
            rows.map((s) => (
              <Fragment key={s.id}>
                <SettingRow
                  db={db}
                  definition={s}
                  section={current}
                  onChanged={changed}
                  jump={jump?.id === s.id ? jump.seq : undefined}
                />
                {tabsAfter === s.id && <PageTabsEditor />}
              </Fragment>
            ))}
          {!searching && section?.kind === 'help' && (
            <HelpSection
              onShow={openHit}
              onFiveTaps={() => {
                openTryNew()
                pick('tryNew')
                setMoved('tryNew')
                setTimeout(() => setMoved(undefined), 3000)
              }}
            />
          )}
          {!searching && rows.length > 0 && section && (
            <SectionReset db={db} sectionName={section.label} rows={rows} />
          )}
          {!searching && section?.kind === 'rows' && rows.length === 0 && (
            <p className="sv3-lead">
              {section.empty ?? tv('sv3.sectionEmpty')}
            </p>
          )}
        </section>
        <PreviewPane last={last} db={db} section={current} />
      </div>
      {!wide && (
        <PreviewPill
          open={sheetOpen}
          onToggle={toggleSheet}
          pulse={unseen}
          last={last}
          db={db}
          section={current}
          area={root}
        />
      )}
    </div>
  )
}
