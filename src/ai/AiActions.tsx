import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { removeAiResult } from '../capture/importNotes'
import { NotesFormatError, type ParsedCard } from '../capture/notesFormat'
import { t } from '../i18n/t'
import { cardText } from '../recall/cardFromAnnotation'
import {
  AI_KEYS,
  applyCards,
  applyKeyPoints,
  applySummary,
  blocker,
  gatherText,
  parseCards,
  readAiConfig,
  runAi,
  type AiAction,
} from './aiRun'
import { AiError, PROVIDERS } from './provider'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * The AI buttons on a source page (CR4): Summarise, Key points, Cards from
 * this page and Cards from highlights. They show only when AI is on in
 * Settings; a notebook must also allow it. Results are ordinary content marked
 * AI-made, cards wait for approval, and one Undo removes a whole result.
 */
export function AiActions({
  db,
  workspaceId,
  page,
  onChanged,
}: {
  db: LearningNotesDB
  workspaceId: string
  page: Page
  onChanged: () => void
}) {
  const { toast, openSettings } = useContext(AppUiContext)
  const [busy, setBusy] = useState(false)
  const [privacyFor, setPrivacyFor] = useState<AiAction | null>(null)
  const [proposal, setProposal] = useState<ParsedCard[] | null>(null)
  const notebook = useLiveQuery(
    () => db.notebooks.get(page.notebookId),
    [db, page.notebookId],
  )
  const config = readAiConfig()
  if (!config.enabled) return null

  const undoable = (batchId: string, label: string) => {
    onChanged()
    toast(label, {
      label: t('annot.undo'),
      onSelect: () =>
        void runTask(removeAiResult(db, page.id, batchId).then(onChanged)),
    })
  }

  const start = async (action: AiAction) => {
    const why = blocker(config, !!notebook?.allowAi)
    if (why === 'notReady') {
      toast(t('ai.notReady'))
      return openSettings()
    }
    if (why === 'allowOff') {
      toast(t('ai.allowOff'))
      return openSettings()
    }
    if (!readPref(AI_KEYS.privacy, isBool, false)) return setPrivacyFor(action)
    setBusy(true)
    toast(t('ai.working'))
    try {
      const text = await gatherText(db, page, action)
      const result = await runAi(config, action, text)
      if (action === 'summary') {
        const r = await applySummary(db, page, result.text)
        undoable(r.batchId, t('ai.done'))
      } else if (action === 'keyPoints') {
        const r = await applyKeyPoints(db, workspaceId, page, result.text)
        undoable(r.batchId, t('ai.done'))
      } else {
        const cards = parseCards(result.text)
        if (cards.length === 0) toast(t('ai.failed', { reason: t('ai.empty') }))
        else setProposal(cards)
      }
    } catch (e) {
      if (e instanceof AiError) toast(t('ai.failed', { reason: e.message }))
      else if (e instanceof NotesFormatError) {
        toast(t('ai.failed', { reason: t('ai.empty') }))
      } else throw e
    } finally {
      setBusy(false)
    }
  }

  const btn =
    'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
  const actions: [AiAction, string, string][] = [
    ['summary', 'ai.summary', 'ai-summary'],
    ['keyPoints', 'ai.keyPoints', 'ai-keypoints'],
    ['cardsPage', 'ai.cardsFromPage', 'ai-cards-page'],
  ]
  if (page.source?.kind === 'book') {
    actions.push(['cardsHighlights', 'ai.cardsFromHighlights', 'ai-cards-hl'])
  }
  return (
    <>
      {actions.map(([action, key, id]) => (
        <button
          key={action}
          type="button"
          data-testid={id}
          disabled={busy}
          onClick={() => void runTask(start(action))}
          className={btn}
        >
          ✦ {t(key as 'ai.summary')}
        </button>
      ))}
      {privacyFor && (
        <div
          data-chrome
          role="dialog"
          aria-label={t('ai.privacyTitle')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-bg p-4 shadow-xl">
            <h2 className="mb-2 text-base font-semibold">
              {t('ai.privacyTitle')}
            </h2>
            <p className="mb-4 text-sm">
              {t('ai.privacy', {
                provider: t(`ai.provider.${config.provider}`),
                host: PROVIDERS[config.provider].host,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrivacyFor(null)}
                className={btn}
              >
                {t('annot.cancel')}
              </button>
              <button
                type="button"
                data-testid="ai-privacy-ok"
                onClick={() => {
                  writePref(AI_KEYS.privacy, true)
                  const action = privacyFor
                  setPrivacyFor(null)
                  void runTask(start(action))
                }}
                className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
              >
                {t('ai.privacyOk')}
              </button>
            </div>
          </div>
        </div>
      )}
      {proposal && (
        <Approval
          cards={proposal}
          onCancel={() => setProposal(null)}
          onMake={(chosen) => {
            setProposal(null)
            runTask(
              applyCards(db, workspaceId, page, chosen).then((r) =>
                undoable(r.batchId, t('ai.done')),
              ),
            )
          }}
        />
      )}
    </>
  )
}

/** The approval list: untick cards you do not want. */
function Approval({
  cards,
  onMake,
  onCancel,
}: {
  cards: ParsedCard[]
  onMake: (chosen: ParsedCard[]) => void
  onCancel: () => void
}) {
  const [off, setOff] = useState<ReadonlySet<number>>(new Set())
  const chosen = cards.filter((_, i) => !off.has(i))
  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('ai.approveTitle')}
      data-testid="ai-approval"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-3"
    >
      <div className="mt-8 w-full max-w-xl rounded-xl border border-line bg-bg p-4 shadow-xl">
        <h2 className="mb-1 text-base font-semibold">{t('ai.approveTitle')}</h2>
        <p className="mb-3 text-sm text-muted">{t('ai.approveHelp')}</p>
        <ul className="mb-3 flex max-h-[50vh] flex-col gap-1 overflow-auto">
          {cards.map((c, i) => (
            <li key={i}>
              <label className="flex min-h-11 items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-hover">
                <input
                  type="checkbox"
                  checked={!off.has(i)}
                  onChange={(e) =>
                    setOff((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.delete(i)
                      else next.add(i)
                      return next
                    })
                  }
                  className="mt-1 size-5"
                />
                <span>
                  {c.kind === 'qa' ? (
                    <>
                      <strong>{c.q}</strong>
                      <br />
                      {cardText(c.a)}
                    </>
                  ) : (
                    c.text
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('annot.cancel')}
          </button>
          <button
            type="button"
            data-testid="ai-approve"
            disabled={chosen.length === 0}
            onClick={() => onMake(chosen)}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('ai.approveMake', { count: chosen.length })}
          </button>
        </div>
      </div>
    </div>
  )
}
