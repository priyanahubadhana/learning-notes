import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { Tip } from '../help/Help'
import { displayName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { PAPER_STYLES, paperStyleKey } from '../pages/paperStyles'
import { setPageInkBg } from '../pages/pageService'
import {
  newPageChooserSetting,
  newPageStudySetting,
} from '../settings/builtinSettings'
import { setSetting } from '../settings/settingsService'
import { useSyncedSetting } from '../settings/useSetting'
import {
  applyTemplateToPage,
  getStudyTemplate,
  isPageBlank,
  listTemplateSummaries,
  startersReady,
} from './templateService'

/**
 * N2: under the cursor of a brand-new, still-empty page. Study (Recommended)
 * first, then the other templates; tapping one fills the page. It goes away
 * as soon as anything is written (the page is no longer blank). The switch
 * "Always start new pages as Study" is the synced setting
 * `newPageStudySetting` (App.createPageIn applies it).
 */
export function NewPageStart({
  db,
  pageId,
  workspaceId,
  onApplied,
  onMakeDatabase,
}: {
  db: LearningNotesDB
  pageId: string
  workspaceId: string
  /** The page was filled: reload the editor. */
  onApplied: () => void
  /** Turns the page into a database page; false = the page was not blank. */
  onMakeDatabase?: () => Promise<boolean>
}) {
  const { toast } = useContext(AppUiContext)
  const blank = useLiveQuery(() => isPageBlank(db, pageId), [db, pageId])
  const study = useLiveQuery(
    () => getStudyTemplate(db, workspaceId),
    [db, workspaceId],
  )
  const templates = useLiveQuery(
    () => listTemplateSummaries(db, workspaceId),
    [db, workspaceId],
  )
  const ready = useLiveQuery(
    () => startersReady(db, workspaceId),
    [db, workspaceId],
  )
  const always = useSyncedSetting(db, newPageStudySetting)
  const chooser = useSyncedSetting(db, newPageChooserSetting)
  const [hidden, setHidden] = useState(false)
  const paper = useLiveQuery(
    async () => (await db.pages.get(pageId))?.inkBg,
    [db, pageId],
  )
  if (!blank || !templates || !ready || hidden || chooser === 'off') return null

  const others = templates.filter((x) => !x.isDaily && x.id !== study?.id)
  const choose = (templateId: string) =>
    runTask(
      (async () => {
        if (await applyTemplateToPage(db, pageId, templateId)) onApplied()
        else toast(t('newPage.notBlank'))
      })(),
    )
  const makeDatabase = () =>
    runTask(
      (async () => {
        if (await onMakeDatabase?.()) onApplied()
        else toast(t('newPage.notBlank'))
      })(),
    )
  const row =
    'min-h-11 rounded-lg border border-line px-3 py-2 text-start text-[14px] hover:border-accent hover:bg-hover'

  return (
    <section
      aria-label={t('newPage.title')}
      data-new-page-start
      className="mt-3 mb-6 max-w-[560px] rounded-xl bg-soft p-3"
    >
      <p className="mb-2 text-[13px] text-ink-soft">{t('newPage.title')}</p>
      <div
        role="group"
        aria-label={t('paper.style')}
        data-new-page-paper
        className="mb-2 flex flex-wrap items-center gap-1.5"
      >
        <span className="me-1 text-[13px] text-ink-soft">
          {t('paper.style')}
        </span>
        {PAPER_STYLES.map((bg) => (
          <button
            key={bg ?? 'blank'}
            type="button"
            aria-pressed={paper === bg}
            data-paper-style={bg ?? 'blank'}
            onClick={() => runTask(setPageInkBg(db, pageId, bg))}
            className="min-h-11 rounded-lg border border-line px-3 text-[13px] hover:border-accent hover:bg-hover aria-pressed:border-accent aria-pressed:bg-hover"
          >
            {t(paperStyleKey(bg))}
          </button>
        ))}
      </div>
      <ul className="grid gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className={`${row} w-full font-medium`}
            data-template="blank"
          >
            {t('sidebar.blankPage')}
            <span className="ms-2 text-[12px] font-normal text-ink-soft">
              {t('picker.blankHelp')}
            </span>
          </button>
        </li>
        {study && (
          <li>
            <button
              type="button"
              onClick={() => choose(study.id)}
              className={`${row} w-full font-medium`}
              data-template="study"
            >
              {t('newPage.study')}
              <span className="ms-2 text-[12px] font-normal text-ink-soft">
                {templates.find((x) => x.id === study.id)?.preview}
              </span>
            </button>
          </li>
        )}
        {others.map((x) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => choose(x.id)}
              className={`${row} w-full`}
            >
              {displayName(x.title) || t('templates.untitled')}
              {x.preview && (
                <span className="ms-2 text-[12px] text-ink-soft">
                  {x.preview}
                </span>
              )}
            </button>
          </li>
        ))}
        {onMakeDatabase && (
          <li>
            <button
              type="button"
              onClick={makeDatabase}
              className={`${row} w-full font-medium`}
              data-template="database"
            >
              {t('newPage.database')}
              <span className="ms-2 text-[12px] font-normal text-ink-soft">
                {t('newPage.databaseHelp')}
              </span>
            </button>
          </li>
        )}
      </ul>
      {study && (
        <Tip id="newPage.always" className="mt-2 flex">
          <label className="flex min-h-11 items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={always === 'on'}
              onChange={(e) =>
                runTask(
                  setSetting(
                    db,
                    newPageStudySetting,
                    e.target.checked ? 'on' : 'off',
                  ),
                )
              }
            />
            {t('newPage.always')}
          </label>
        </Tip>
      )}
      <button
        type="button"
        data-new-page-dismiss
        onClick={() => {
          runTask(setSetting(db, newPageChooserSetting, 'off'))
          toast(t('newPage.hiddenToast'))
        }}
        className="mt-1 min-h-11 text-start text-[13px] text-ink-soft underline"
      >
        {t('newPage.dontShow')}
      </button>
    </section>
  )
}
