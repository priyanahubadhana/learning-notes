import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { readPref, writePref } from '../app/uiPrefs'
import { addBlocks } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import type { Page } from '../core/types'
import { removeAiResult } from '../capture/importNotes'
import { markdownToBlocks } from '../editor/textBlocks'
import { t } from '../i18n/t'
import { Approval } from '../ai/AiActions'
import {
  AI_KEYS,
  applyCards,
  forNotebook,
  parseCards,
  readAiConfig,
} from '../ai/aiRun'
import { AiError, PROVIDERS } from '../ai/provider'
import { ratePrompt, type Library } from './libraryDb'
import type { PromptItem } from './promptModel'
import {
  PROMPT_MAX_TOKENS,
  composePrompt,
  configFor,
  estimateCost,
  runPrompt,
  whyNot,
} from './promptRun'
import { CostLine, InputPicker, InputStatus, StarRating } from './RunParts'
import { EMPTY_INPUT, type InputValue } from './inputSource'

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * Runs one plain prompt: pick the input, see the cost in rupees and tokens,
 * run, read the answer (editable), rate it, add it to the page or copy it.
 */
export function RunPrompt({
  db,
  workspaceId,
  page,
  item: first,
  lib,
  onBack,
  onChanged,
}: {
  db: LearningNotesDB
  workspaceId: string
  page?: Page
  item: PromptItem
  lib: Library
  onBack: () => void
  onChanged?: () => void
}) {
  const { toast, openSettings } = useContext(AppUiContext)
  const [item, setItem] = useState(first)
  const [input, setInput] = useState<InputValue>(EMPTY_INPUT)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [cards, setCards] = useState<ReturnType<typeof parseCards> | null>(null)
  const [rated, setRated] = useState(0)
  const notebook = useLiveQuery(
    () => (page ? db.notebooks.get(page.notebookId) : undefined),
    [db, page],
  )
  const config = configFor(forNotebook(readAiConfig(), notebook), item)

  const cost = useMemo(
    () =>
      estimateCost(config, composePrompt(item, input.text), PROMPT_MAX_TOKENS),
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
      setAnswer(await runPrompt(config, item, input.text, { page, db }))
      setRated(0)
    } catch (e) {
      if (e instanceof AiError) toast(t('ai.failed', { reason: e.message }))
      else throw e
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!page) return
    if (item.output === 'cards') {
      const found = parseCards(answer)
      if (found.length > 0) return setCards(found)
    }
    const batchId = createId()
    await addBlocks(
      db,
      page.id,
      [
        {
          type: 'heading',
          content: {
            level: 2,
            text: [{ type: 'text', text: item.name, styles: {} }],
          },
        },
        ...markdownToBlocks(answer),
      ],
      { source: 'ai', batchId },
    )
    onChanged?.()
    toast(t('ai.done'), {
      label: t('annot.undo'),
      onSelect: () =>
        runTask(removeAiResult(db, page.id, batchId).then(() => onChanged?.())),
    })
  }

  const rate = (n: number) =>
    runTask(
      ratePrompt(db, lib, item, n).then((next) => {
        setItem(next)
        setRated(n)
        toast(t('prompts.rated'))
      }),
    )

  return (
    <div className="flex flex-col gap-3" data-testid="run-prompt">
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={onBack}>
          {t('prompts.back')}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
          {item.name}
        </h3>
      </div>
      <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted">
        {item.text}
      </p>
      <InputPicker db={db} page={page} onChange={setInput} />
      <InputStatus value={input} />
      <CostLine cost={cost} />
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
      {answer && (
        <div className="flex flex-col gap-2">
          <textarea
            data-testid="run-answer"
            aria-label={t('prompts.answer')}
            className="min-h-48 rounded-lg border border-line bg-bg p-2 text-sm"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <StarRating
            value={rated}
            label={t('prompts.rateResult')}
            onRate={rate}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={btn}
              onClick={() =>
                runTask(
                  navigator.clipboard
                    .writeText(answer)
                    .then(() => toast(t('prompts.copied'))),
                )
              }
            >
              {t('prompts.copy')}
            </button>
            {page && (
              <button
                type="button"
                data-testid="run-apply"
                className={primary}
                onClick={() => runTask(apply())}
              >
                {t('prompts.addToPage')}
              </button>
            )}
          </div>
        </div>
      )}
      {cards && (
        <Approval
          cards={cards}
          onCancel={() => setCards(null)}
          onMake={(chosen) => {
            setCards(null)
            if (!page) return
            runTask(
              applyCards(db, workspaceId, page, chosen).then((r) => {
                onChanged?.()
                toast(t('ai.done'), {
                  label: t('annot.undo'),
                  onSelect: () =>
                    runTask(
                      removeAiResult(db, page.id, r.batchId).then(() =>
                        onChanged?.(),
                      ),
                    ),
                })
              }),
            )
          }}
        />
      )}
    </div>
  )
}
