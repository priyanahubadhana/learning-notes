import { useLiveQuery } from 'dexie-react-hooks'
import { formatCost } from './costCurrency'
import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { removeAiResult } from '../capture/importNotes'
import { recordAiBatch, undoAiBatch } from '../core/aiHistory'
import type { ParsedCard } from '../capture/notesFormat'
import { t } from '../i18n/t'
import type { SearchableDoc } from '../reader/pdf/pdfSearch'
import { Approval } from './AiActions'
import {
  applyCards,
  applySummary,
  aiLockedBlock,
  blocker,
  forNotebook,
  parseCards,
  readAiConfig,
  runAi,
} from './aiRun'
import {
  ASK_MAX_TOKENS,
  STORY_MAX_TOKENS,
  askPrompt,
  gatherParts,
  pdfChapters,
  promptTokens,
  readPartOf,
  sectionOfCfi,
  splitCitations,
  storyPrompt,
  type BookPart,
  type Gathered,
} from './bookAsk'
import { PromptPickerButton } from '../prompts/PromptPickerButton'
import { openEpub, pdfParts, type EpubBook } from './bookText'
import { AiError, PROVIDERS } from './provider'
import { callAi } from './route'
import { costOf } from './usage'
import { AiOffCard } from './AiOffCard'
import { useAiTick } from './aiOffStore'

export interface AskBookProps {
  /** A question to start with (from the reader's Ask AI on a selection). */
  initialQuestion?: string
  db: LearningNotesDB
  page: Page
  format: 'pdf' | 'epub'
  pdfDoc: SearchableDoc | null
  epubData: ArrayBuffer | null
  outline: readonly { title: string; page: number; depth: number }[]
  pageCount: number
  position: {
    page: number
    locator: string
    unitsLeft?: { chapter: number; book: number }
  } | null
  /** Jumps the reader (`pdf:12:0` or `href:...`). */
  onGo: (at: string) => void
}

/** Characters in one foliate size unit (what `unitsLeft` counts). */
const UNIT_CHARS = 1600

type Mode = 'ask' | 'story'
interface Prepared {
  gathered: Gathered
  prompt: string
  maxTokens: number
  what: string
}

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
const field =
  'min-h-11 rounded-lg border border-line bg-bg px-2 text-sm outline-none focus:border-accent'

/**
 * Ask this book and Story so far (Phase P), in the reader's side panel. You
 * choose what is sent (a chapter or pages), see it and its cost first, and
 * the answer streams in with Stop. Citations jump to the page or chapter.
 */
export function AskBook(props: AskBookProps) {
  const { db, page, format } = props
  const { toast, openSettings } = useContext(AppUiContext)
  useAiTick()
  const notebook = useLiveQuery(
    () => db.notebooks.get(page.notebookId),
    [db, page.notebookId],
  )
  const locked = useLiveQuery(() => aiLockedBlock(db, page.id), [db, page.id])
  const config = forNotebook(readAiConfig(), notebook)
  const [mode, setMode] = useState<Mode>('ask')
  const [question, setQuestion] = useState(props.initialQuestion ?? '')
  const [epub, setEpub] = useState<EpubBook | null>(null)
  const here = props.position?.page ?? 1
  const hereSection = props.position
    ? (sectionOfCfi(props.position.locator) ?? 0)
    : 0
  const chapters =
    format === 'pdf'
      ? pdfChapters(props.outline, props.pageCount)
      : (epub?.chapters ?? []).map((c, i) => ({
          title: c.title,
          from: i,
          to: i,
        }))
  // The scope: a chapter index, or -1 for a page range (PDF).
  const [scope, setScope] = useState<number | null>(null)
  const [from, setFrom] = useState(here)
  const [to, setTo] = useState(here)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [answer, setAnswer] = useState('')
  const [parts, setParts] = useState<BookPart[]>([])
  const [running, setRunning] = useState(false)
  const [stopped, setStopped] = useState(false)
  const [cards, setCards] = useState<ParsedCard[] | null>(null)
  const stop = useRef<AbortController | null>(null)
  useEffect(() => () => stop.current?.abort(), [])

  useEffect(() => {
    if (format !== 'epub' || !props.epubData) return
    let live = true
    void openEpub(props.epubData)
      .then((b) => live && setEpub(b))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [format, props.epubData])

  // The chapter you are in is the first choice.
  const currentChapter =
    format === 'pdf'
      ? Math.max(
          0,
          chapters.findIndex((c) => c.from <= here && here <= c.to),
        )
      : hereSection
  const chosen = scope ?? (chapters.length ? currentChapter : -1)

  // Library books follow the global AI switch; only other notebooks need their own permission.
  const libraryBook = notebook?.kind === 'books' || notebook?.kind === 'sources'
  const why = blocker(
    config,
    !!notebook?.allowAi || libraryBook,
    locked === true,
  )
  if (why) {
    return (
      <div data-testid="ask-book" className="flex flex-col gap-3 text-sm">
        <h2 className="text-base font-semibold">{t('ai.book.title')}</h2>
        {why === 'notReady' ? (
          <AiOffCard />
        ) : (
          <p>
            {t(
              why === 'allowOff'
                ? 'ai.book.off'
                : why === 'lockedOff'
                  ? 'ai.lockedOff'
                  : 'ai.notReady',
            )}
          </p>
        )}
        {why === 'allowOff' && (
          <button
            type="button"
            data-testid="ask-book-allow"
            className={primary}
            onClick={() =>
              void db.notebooks.update(page.notebookId, {
                allowAi: true,
                updatedAt: Date.now(),
              })
            }
          >
            {t('ai.book.allowHere')}
          </button>
        )}
        <button
          type="button"
          className={btn}
          onClick={() =>
            openSettings(
              why === 'notReady'
                ? 'ai/ai.keyList'
                : `permissions/perm.nb.${page.notebookId}`,
            )
          }
        >
          {t('ai.book.openSettings')}
        </button>
      </div>
    )
  }

  const reset = () => {
    setPrepared(null)
    setAnswer('')
    setStopped(false)
  }

  const gather = async (): Promise<Prepared | null> => {
    if (mode === 'story') {
      if (format === 'pdf') {
        if (!props.pdfDoc) return null
        const list = await pdfParts(props.pdfDoc, 1, here)
        const g = gatherParts(list, true)
        return {
          gathered: g,
          prompt: storyPrompt(g.text),
          maxTokens: STORY_MAX_TOKENS,
          what: t('ai.book.storyWhat', {
            where: t('ai.book.wherePage', { page: here }),
          }),
        }
      }
      if (!epub) return null
      const list: BookPart[] = []
      for (let i = 0; i < hereSection; i++) list.push(await epub.part(i))
      const cur = await epub.part(hereSection)
      const left = props.position?.unitsLeft
      list.push({
        ...cur,
        text: readPartOf(
          cur.text,
          left ? left.chapter * UNIT_CHARS : undefined,
        ),
      })
      const g = gatherParts(list, true)
      return {
        gathered: g,
        prompt: storyPrompt(g.text),
        maxTokens: STORY_MAX_TOKENS,
        what: t('ai.book.storyWhat', {
          where: t('ai.book.whereChapter', { n: hereSection + 1 }),
        }),
      }
    }
    let list: BookPart[]
    let what: string
    if (format === 'pdf') {
      if (!props.pdfDoc) return null
      const range =
        chosen >= 0 && chapters[chosen]
          ? chapters[chosen]
          : { from: Math.min(from, to), to: Math.max(from, to) }
      list = await pdfParts(props.pdfDoc, range.from, range.to)
      what = t('ai.book.pagesWhat', { from: range.from, to: range.to })
    } else {
      if (!epub) return null
      const i = Math.max(0, chosen)
      list = [await epub.part(i)]
      what = t('ai.book.whereChapter', { n: i + 1 })
    }
    const g = gatherParts(list)
    return {
      gathered: g,
      prompt: askPrompt(question, g.text),
      maxTokens: ASK_MAX_TOKENS,
      what,
    }
  }

  const prepare = async () => {
    reset()
    const p = await gather()
    if (!p || !p.gathered.text) return toast(t('ai.book.noneRead'))
    setPrepared(p)
  }

  const send = async () => {
    if (!prepared) return
    const ctrl = new AbortController()
    stop.current = ctrl
    setRunning(true)
    setAnswer('')
    setStopped(false)
    setParts(prepared.gathered.parts)
    try {
      const r = await callAi(config, {
        prompt: prepared.prompt,
        maxTokens: prepared.maxTokens,
        signal: ctrl.signal,
        onText: (piece) => setAnswer((a) => a + piece),
        log: {
          notebookId: page.notebookId,
          feature: mode === 'ask' ? 'askBook' : 'storySoFar',
        },
        where: { db, pageId: page.id },
      })
      setAnswer(r.text)
      if (r.stopped) setStopped(true)
      setPrepared(null)
    } catch (e) {
      if (e instanceof AiError) toast(t('ai.failed', { reason: e.message }))
      else throw e
    } finally {
      setRunning(false)
      stop.current = null
    }
  }

  const undoable = (batchId: string) => {
    const since = recordAiBatch(page.id, batchId, t('ai.done'))
    toast(t('ai.done'), {
      label: t('annot.undo'),
      onSelect: () =>
        undoAiBatch(
          since,
          () => void runTask(removeAiResult(db, page.id, batchId)),
        ),
    })
  }

  const makeCards = async () => {
    try {
      const r = await runAi(
        config,
        'cardsPage',
        answer,
        undefined,
        page.notebookId,
        { db, pageId: page.id },
      )
      const list = parseCards(r.text)
      if (list.length === 0) toast(t('ai.failed', { reason: t('ai.empty') }))
      else setCards(list)
    } catch (e) {
      if (e instanceof AiError) toast(t('ai.failed', { reason: e.message }))
      else throw e
    }
  }

  const head = config.candidates[0]
  const host = PROVIDERS[config.provider].host
  const cost = prepared
    ? costOf(
        config.provider,
        head?.model ?? config.model,
        promptTokens(prepared.prompt),
        prepared.maxTokens,
      )
    : 0

  return (
    <div data-testid="ask-book" className="flex flex-col gap-3 text-sm">
      <h2 className="text-base font-semibold">{t('ai.book.title')}</h2>
      <div role="tablist" className="flex gap-1">
        {(['ask', 'story'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            data-testid={`ask-book-${m}`}
            onClick={() => {
              setMode(m)
              reset()
            }}
            className={`${btn} ${mode === m ? 'border-ink font-semibold' : ''}`}
          >
            {t(m === 'ask' ? 'ai.book.tabAsk' : 'ai.book.tabStory')}
          </button>
        ))}
      </div>

      {mode === 'story' ? (
        <p className="text-muted">{t('ai.book.storyHelp')}</p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            {t('ai.book.scope')}
            <select
              data-testid="ask-book-scope"
              value={chosen}
              onChange={(e) => {
                setScope(Number(e.target.value))
                reset()
              }}
              className={field}
            >
              {chapters.map((c, i) => (
                <option key={i} value={i}>
                  {t('ai.book.chapter', { title: c.title })}
                </option>
              ))}
              {format === 'pdf' && (
                <option value={-1}>{t('ai.book.pages')}</option>
              )}
            </select>
          </label>
          {format === 'pdf' && chosen === -1 && (
            <div className="flex gap-2">
              <label className="flex flex-col gap-1">
                {t('ai.book.from')}
                <input
                  type="number"
                  min={1}
                  max={props.pageCount || undefined}
                  value={from}
                  data-testid="ask-book-from"
                  onChange={(e) => {
                    setFrom(Math.max(1, Number(e.target.value) || 1))
                    reset()
                  }}
                  className={`${field} w-24`}
                />
              </label>
              <label className="flex flex-col gap-1">
                {t('ai.book.to')}
                <input
                  type="number"
                  min={1}
                  max={props.pageCount || undefined}
                  value={to}
                  data-testid="ask-book-to"
                  onChange={(e) => {
                    setTo(Math.max(1, Number(e.target.value) || 1))
                    reset()
                  }}
                  className={`${field} w-24`}
                />
              </label>
            </div>
          )}
          <PromptPickerButton
            db={db}
            workspaceId={notebook?.workspaceId ?? ''}
            onPick={(text) => {
              setQuestion(text.slice(0, 2000))
              setPrepared(null)
            }}
          />
          <label className="flex flex-col gap-1">
            {t('ai.book.question')}
            <textarea
              data-testid="ask-book-question"
              value={question}
              maxLength={2000}
              onChange={(e) => {
                setQuestion(e.target.value)
                setPrepared(null)
              }}
              className={`${field} min-h-20 py-2`}
            />
          </label>
        </>
      )}

      {!prepared && !running && (
        <button
          type="button"
          data-testid="ask-book-prepare"
          disabled={mode === 'ask' && !question.trim()}
          onClick={() => void runTask(prepare())}
          className={btn}
        >
          {t('ai.book.prepare')}
        </button>
      )}

      {prepared && !running && (
        <div
          data-testid="ask-book-preview"
          className="flex flex-col gap-2 rounded-lg border border-line p-2"
        >
          <p>
            {t('ai.book.willSend', {
              words: prepared.gathered.words,
              what: prepared.what,
              host,
              cost: formatCost(cost, 4),
            })}
          </p>
          {prepared.gathered.cut && (
            <p className="text-muted">
              {t(mode === 'story' ? 'ai.book.cutStory' : 'ai.book.cut')}
            </p>
          )}
          <details>
            <summary className="cursor-pointer">
              {t('ai.book.showText')}
            </summary>
            <pre className="mt-1 max-h-48 overflow-auto text-xs whitespace-pre-wrap">
              {prepared.gathered.text}
            </pre>
          </details>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn} onClick={reset}>
              {t('annot.cancel')}
            </button>
            <button
              type="button"
              data-testid="ask-book-send"
              className={primary}
              onClick={() => void runTask(send())}
            >
              {t('ai.book.send')}
            </button>
          </div>
        </div>
      )}

      {(answer || running) && (
        <div
          data-testid="ask-book-answer"
          aria-live="polite"
          className="rounded-lg border border-line p-2 whitespace-pre-wrap"
        >
          {splitCitations(answer, parts).map((p, i) =>
            p.kind === 'text' ? (
              <span key={i}>{p.text}</span>
            ) : p.at ? (
              <button
                key={i}
                type="button"
                data-testid="ask-book-cite"
                aria-label={t('ai.book.cite', { cite: p.cite })}
                onClick={() => props.onGo(p.at!)}
                className="mx-0.5 rounded bg-soft px-1 text-xs text-accent underline"
              >
                {p.cite}
              </button>
            ) : (
              <span key={i} className="text-xs text-muted">
                [{p.cite}]
              </span>
            ),
          )}
        </div>
      )}
      {running && (
        <button
          type="button"
          data-testid="ask-book-stop"
          className={btn}
          onClick={() => stop.current?.abort()}
        >
          {t('ai.book.stop')}
        </button>
      )}
      {stopped && <p className="text-muted">{t('ai.book.stopped')}</p>}
      {answer && !running && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="ask-book-save"
            className={btn}
            onClick={() =>
              void runTask(
                applySummary(db, page, answer).then((r) => undoable(r.batchId)),
              )
            }
          >
            {t('ai.book.saveSummary')}
          </button>
          <button
            type="button"
            data-testid="ask-book-cards"
            className={btn}
            onClick={() => void runTask(makeCards())}
          >
            {t('ai.book.makeCards')}
          </button>
        </div>
      )}
      {cards && (
        <Approval
          cards={cards}
          onCancel={() => setCards(null)}
          onMake={(list) => {
            setCards(null)
            runTask(
              applyCards(db, notebook?.workspaceId ?? '', page, list).then(
                (r) => undoable(r.batchId),
              ),
            )
          }}
        />
      )}
    </div>
  )
}
