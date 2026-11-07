import { useLiveQuery } from 'dexie-react-hooks'
import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { Tip } from '../help/Help'
import { displayName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { newPageStudySetting } from '../settings/builtinSettings'
import { setSetting } from '../settings/settingsService'
import { useSyncedSetting } from '../settings/useSetting'
import {
  applyTemplateToPage,
  getStudyTemplate,
  isPageBlank,
  listTemplateSummaries,
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
}: {
  db: LearningNotesDB
  pageId: string
  workspaceId: string
  /** The page was filled: reload the editor. */
  onApplied: () => void
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
  const always = useSyncedSetting(db, newPageStudySetting)
  if (!blank || !templates) return null

  const others = templates.filter((x) => !x.isDaily && x.id !== study?.id)
  const choose = (templateId: string) =>
    runTask(
      (async () => {
        if (await applyTemplateToPage(db, pageId, templateId)) onApplied()
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
      <ul className="grid gap-1.5">
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
    </section>
  )
}
