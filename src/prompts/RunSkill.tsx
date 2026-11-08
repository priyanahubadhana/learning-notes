import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { routeToHash } from '../app/router'
import { readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { t } from '../i18n/t'
import { listNotebooks } from '../notebooks/notebookService'
import { AI_KEYS, forNotebook, readAiConfig } from '../ai/aiRun'
import { AiError, PROVIDERS } from '../ai/provider'
import { ratePrompt, type Library } from './libraryDb'
import { EMPTY_INPUT, type InputValue } from './inputSource'
import type { PromptItem } from './promptModel'
import { whyNot } from './promptRun'
import { CostLine, InputPicker, InputStatus, StarRating } from './RunParts'
import { SkillPreview } from './SkillPreview'
import { SkillFormatError, type SkillResult } from './skillFormat'
import {
  factCheckCost,
  runFactCheck,
  runSkill,
  skillConfig,
  skillCost,
} from './skillRun'
import { saveSkillResult, undoSave, type Saved } from './skillSave'

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * Runs a skill: one input (pasted text, a page, a PDF), the cost first, one
 * call, then the preview where everything can be edited or unticked before
 * it is saved into a notebook. One Undo takes the saved result away.
 */
export function RunSkill({
  db,
  workspaceId,
  page,
  item: first,
  lib,
  onBack,
}: {
  db: LearningNotesDB
  workspaceId: string
  page?: Page
  item: PromptItem
  lib: Library
  onBack: () => void
}) {
  const { toast, openSettings } = useContext(AppUiContext)
  const [item, setItem] = useState(first)
  const [input, setInput] = useState<InputValue>(EMPTY_INPUT)
  const [busy, setBusy] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [result, setResult] = useState<SkillResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [rated, setRated] = useState(0)
  const notebook = useLiveQuery(
    () => (page ? db.notebooks.get(page.notebookId) : undefined),
    [db, page],
  )
  const notebooks = useLiveQuery(
    async () => (await listNotebooks(db, workspaceId)).filter((n) => !n.kind),
    [db, workspaceId],
  )
  const base = forNotebook(readAiConfig(), notebook)
  const config = skillConfig(base, item)

  const cost = useMemo(
    () => skillCost(config, item, input.text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, input.text, config.model, config.provider],
  )

  const run = async () => {
    const why = await whyNot(db, config, page)
    if (why) {
      toast(why)
      if (!config.enabled || config.candidates.length === 0) openSettings()
      return
    }
    if (!readPref(AI_KEYS.privacy, isBool, false)) return setPrivacy(true)
    setBusy(true)
    try {
      setResult(await runSkill(base, item, input.text, { page, db }))
      setRated(0)
    } catch (e) {
      if (e instanceof AiError) toast(t('ai.failed', { reason: e.message }))
      else if (e instanceof SkillFormatError) toast(t('prompts.badAnswer'))
      else throw e
    } finally {
      setBusy(false)
    }
  }

  const rate = (n: number) =>
    runTask(
      ratePrompt(db, lib, item, n).then((next) => {
        setItem(next)
        setRated(n)
        toast(t('prompts.rated'))
      }),
    )

  const savedPanel = saved && (
    <div className="flex flex-col gap-3" data-testid="skill-saved">
      <p className="text-sm">
        {t('prompts.savedCount', { count: saved.pageIds.length })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          data-testid="skill-undo"
          onClick={() =>
            runTask(
              undoSave(db, saved).then(() => {
                setSaved(null)
                toast(t('prompts.undone'))
              }),
            )
          }
        >
          {t('annot.undo')}
        </button>
        <button
          type="button"
          className={primary}
          data-testid="skill-open"
          onClick={() => {
            window.location.hash = routeToHash({
              kind: 'page',
              id: saved.firstPageId,
            })
          }}
        >
          {t('prompts.openResult')}
        </button>
      </div>
    </div>
  )

  if (result) {
    const mainModel = config.candidates[0]?.model ?? config.model
    const canCheck = config.enabled && config.candidates.length > 0
    return (
      <>
        {savedPanel}
        <div hidden={!!saved}>
          <SkillPreview
            key={result.title + result.points.length}
            initial={result}
            notebooks={(notebooks ?? []).map((n) => ({
              id: n.id,
              title: n.title,
            }))}
            defaultNotebookId={page?.notebookId}
            saving={saving}
            onCancel={() => setResult(null)}
            fact={
              canCheck
                ? {
                    cost: factCheckCost(base, result, mainModel),
                    run: async (current) => {
                      const why = await whyNot(db, base, page)
                      if (why) {
                        toast(why)
                        return current
                      }
                      try {
                        return await runFactCheck(base, current, mainModel, {
                          page,
                          db,
                        })
                      } catch (e) {
                        if (e instanceof AiError) {
                          toast(t('ai.failed', { reason: e.message }))
                          return current
                        }
                        if (e instanceof SkillFormatError) {
                          toast(t('prompts.badAnswer'))
                          return current
                        }
                        throw e
                      }
                    },
                  }
                : undefined
            }
            footer={
              <StarRating
                value={rated}
                label={t('prompts.rateResult')}
                onRate={rate}
              />
            }
            onSave={(chosen, target) => {
              setSaving(true)
              runTask(
                saveSkillResult(db, workspaceId, chosen, target)
                  .then((s) => setSaved(s))
                  .finally(() => setSaving(false)),
              )
            }}
          />
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3" data-testid="run-skill">
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={onBack}>
          {t('prompts.back')}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
          ⛓ {item.name}
        </h3>
      </div>
      <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted">
        {item.text}
      </p>
      <InputPicker db={db} page={page} onChange={setInput} />
      <InputStatus value={input} />
      <CostLine cost={cost} />
      <p className="text-xs text-muted">{t('prompts.oneCall')}</p>
      {privacy && (
        <div className="rounded-lg border border-line p-3 text-sm" role="alert">
          <p className="mb-2">
            {t('ai.privacy', {
              provider: t(`ai.provider.${config.provider}`),
              host: PROVIDERS[config.provider].host,
            })}
          </p>
          <button
            type="button"
            data-testid="ai-privacy-ok"
            className={primary}
            onClick={() => {
              writePref(AI_KEYS.privacy, true)
              setPrivacy(false)
              runTask(run())
            }}
          >
            {t('ai.privacyOk')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="run-ai"
          className={primary}
          disabled={busy || input.busy || !input.text}
          onClick={() => runTask(run())}
        >
          {busy ? t('ai.working') : t('prompts.run')}
        </button>
      </div>
    </div>
  )
}
