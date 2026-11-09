import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { runTask } from '../app/errors'
import { readPref, writePref } from '../app/uiPrefs'
import { AI_KEYS, blocker, forNotebook, readAiConfig } from '../ai/aiRun'
import { AiError, PROVIDERS } from '../ai/provider'
import { costLine } from '../prompts/promptRun'
import { t } from '../i18n/t'
import {
  MAX_CLEANUP_CHARS,
  cleanupCost,
  loadCleanupPrompt,
  missingFigures,
  runCleanup,
  saveCleanupPrompt,
  unplacedLines,
  type CleanupPrompt,
} from './cleanupAi'
import { AiOffCard } from '../ai/AiOffCard'
import { useAiTick } from '../ai/aiOffStore'
import { pasteContext, type CleanupRequest } from './pasteFlow'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'

interface NotebookInfo {
  id: string
  workspaceId: string
  allowAi?: boolean
  aiChoice?: { keyId: string; model: string }
}

/**
 * The "Clean up with AI" step of the paste chooser: the instructions (the
 * library prompt, editable), the cost BEFORE anything is sent, then a preview
 * of the rebuilt structure with anything unplaced flagged, then Insert.
 */
export function CleanupDialog({ request }: { request: CleanupRequest }) {
  const ctx = pasteContext()
  const { plan } = request
  const [loaded, setLoaded] = useState<CleanupPrompt | null>(null)
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [notebook, setNotebook] = useState<NotebookInfo | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctx) return
    let live = true
    void (async () => {
      const nb = await ctx.db.notebooks.get(ctx.notebookId)
      if (!live || !nb) return
      setNotebook(nb as NotebookInfo)
      const p = await loadCleanupPrompt(ctx.db, nb.workspaceId)
      if (!live) return
      setLoaded(p)
      setPrompt(p.text)
    })()
    return () => {
      live = false
    }
  }, [ctx])
  useEffect(() => box.current?.focus(), [])

  useAiTick()
  const config = forNotebook(readAiConfig(), notebook ?? undefined)
  const tooLong = plan.text.length > MAX_CLEANUP_CHARS
  const cost = loaded ? cleanupCost(config, prompt, plan.text) : null

  const start = async () => {
    if (!ctx || !notebook || !loaded) return
    const why = blocker(config, !!notebook.allowAi)
    if (why) {
      setError(t(why === 'notReady' ? 'ai.notReady' : 'ai.allowOff'))
      return
    }
    if (!readPref(AI_KEYS.privacy, isBool, false)) return setPrivacy(true)
    setBusy(true)
    setError('')
    try {
      await saveCleanupPrompt(ctx.db, notebook.workspaceId, loaded, prompt)
      setAnswer(
        await runCleanup(config, prompt, plan.text, {
          notebookId: notebook.id,
        }),
      )
    } catch (e) {
      setError(
        t('cleanup.failed', {
          reason: e instanceof AiError ? e.message : String(e),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  const unplaced = answer ? unplacedLines(answer) : []
  const missing = answer ? missingFigures(plan.text, answer) : []

  return createPortal(
    <div
      data-chrome
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-3 sm:items-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) request.cancel()
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-label={t('cleanup.title')}
        tabIndex={-1}
        data-testid="cleanup-dialog"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) request.cancel()
        }}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-2 overflow-y-auto rounded-xl border border-line bg-bg p-4 shadow-xl outline-none"
      >
        <h2 className="text-base font-semibold">{t('cleanup.title')}</h2>
        <AiOffCard />
        {privacy ? (
          <>
            <p className="text-sm">
              {t('ai.privacy', {
                provider: t(`ai.provider.${config.provider}`),
                host: PROVIDERS[config.provider].host,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={request.cancel}>
                {t('cleanup.cancel')}
              </button>
              <button
                type="button"
                data-testid="cleanup-privacy-ok"
                className={primary}
                onClick={() => {
                  writePref(AI_KEYS.privacy, true)
                  setPrivacy(false)
                  void runTask(start())
                }}
              >
                {t('ai.privacyOk')}
              </button>
            </div>
          </>
        ) : answer === null ? (
          <>
            <p className="text-sm text-ink-soft">{t('cleanup.intro')}</p>
            <label className="grid gap-1 text-sm">
              {t('cleanup.prompt')}
              <textarea
                data-testid="cleanup-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-line bg-bg p-2 text-sm"
              />
            </label>
            {tooLong ? (
              <p role="alert" className="text-sm text-danger">
                {t('cleanup.tooLong')}
              </p>
            ) : (
              cost && (
                <p data-testid="cleanup-cost" className="text-sm">
                  <span className="font-medium">{t('cleanup.cost')}: </span>
                  {costLine(cost)}
                </p>
              )
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={request.cancel}
              >
                {t('cleanup.cancel')}
              </button>
              <button
                type="button"
                data-testid="cleanup-run"
                className={primary}
                disabled={busy || tooLong || !loaded || prompt.trim() === ''}
                onClick={() => void runTask(start())}
              >
                {busy ? t('cleanup.working') : t('cleanup.run')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">{t('cleanup.previewTitle')}</p>
            {(unplaced.length > 0 || missing.length > 0) && (
              <p
                role="status"
                data-testid="cleanup-unplaced"
                className="rounded-lg bg-soft p-2 text-sm"
              >
                {t('cleanup.unplaced')}:{' '}
                {[...unplaced, ...missing.map((n) => `#${n}`)].join(' · ')}
              </p>
            )}
            <pre
              data-testid="cleanup-preview"
              className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line p-2 text-[13px]"
            >
              {answer}
            </pre>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={request.cancel}>
                {t('cleanup.cancel')}
              </button>
              <button
                type="button"
                data-testid="cleanup-insert"
                className={primary}
                onClick={() => request.insert(answer)}
              >
                {t('cleanup.insert')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
