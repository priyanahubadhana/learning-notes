import { sampleName } from '../../i18n/defaultNames'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import { formatSize } from '../formatSize'
import { FileButton } from '../FileButton'
import { t } from '../../i18n/t'
import { cardsFromRows, kindOfFile, type NlmKind, type QaCard } from './parse'
import type { NlmMade } from './run'

/** What the user is about to bring in, parsed and ready to add. */
interface Plan {
  kind: NlmKind
  /** The one line shown in the preview ("12 cards"). */
  what: string
  file?: File
  /** Card list, outline text, report text or table, whichever the kind uses. */
  cards?: QaCard[]
  text?: string
  table?: { headers: string[]; body: string[][] }
  size?: { width: number; height: number }
}

const PASTE_KINDS = ['report', 'cards', 'quiz', 'table', 'mindmap'] as const
type PasteKind = (typeof PASTE_KINDS)[number]

/** Length of an audio file in ms (0 if the browser cannot tell in 3 s). */
function audioLength(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const done = (ms: number) => {
      URL.revokeObjectURL(url)
      resolve(ms)
    }
    const timer = setTimeout(() => done(0), 3000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      clearTimeout(timer)
      done(Number.isFinite(audio.duration) ? audio.duration * 1000 : 0)
    }
    audio.onerror = () => {
      clearTimeout(timer)
      done(0)
    }
    audio.src = url
  })
}

/**
 * Import › Bring in from NotebookLM. Choose or drop a file, or paste text;
 * the preview says what it is and where it goes; Add puts it there, and one
 * Undo takes it all back. A one-time copy: nothing is sent anywhere (except
 * the optional picture rebuild, which uses the owner's own AI key after the
 * cost is shown). The heavy code is loaded only when something is chosen.
 */
export function NotebookLmImport({
  db,
  workspaceId,
  notebooks,
  box,
}: {
  db: LearningNotesDB
  workspaceId: string
  notebooks: { id: string; title: string }[]
  box: string
}) {
  const ui = useContext(AppUiContext)
  const [notebookId, setNotebookId] = useState('')
  const [pageId, setPageId] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [csvAs, setCsvAs] = useState<'cards' | 'table'>('cards')
  const [csvText, setCsvText] = useState('')
  const [pasted, setPasted] = useState('')
  const [pasteKind, setPasteKind] = useState<PasteKind>('report')
  const [rebuild, setRebuild] = useState(false)
  const [costLine, setCostLine] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  const activeNotebook = notebookId || notebooks[0]?.id || ''
  const pages = useLiveQuery(
    async () =>
      activeNotebook
        ? (await db.pages.where('notebookId').equals(activeNotebook).toArray())
            .filter((p) => isLive(p) && !p.templateRole && !p.databaseId)
            .sort((a, b) => (a.order < b.order ? -1 : 1))
            .slice(0, 500)
        : [],
    [db, activeNotebook],
  )
  const pageIdOk = pageId && pages?.some((p) => p.id === pageId) ? pageId : ''

  const fail = (e: unknown) =>
    setError(
      t('nlm.err.failed', {
        reason: e instanceof Error ? e.message : String(e),
      }),
    )

  const fromRows = async (rows: string[][], as: 'cards' | 'table') => {
    if (as === 'cards') {
      const cards = cardsFromRows(rows)
      if (!cards.length) throw new Error(t('nlm.err.noCards'))
      setPlan({
        kind: 'cards',
        cards,
        what: t('nlm.what.cards', { count: cards.length }),
      })
    } else {
      const table = { headers: rows[0] ?? [], body: rows.slice(1) }
      if (!table.body.length) throw new Error(t('nlm.err.empty'))
      setPlan({
        kind: 'table',
        table,
        what: t('nlm.what.table', {
          rows: table.body.length,
          columns: table.headers.length,
        }),
      })
    }
  }

  const planFile = async (file: File) => {
    setError('')
    setRebuild(false)
    setCostLine('')
    setBusy(t('nlm.reading'))
    try {
      const kind = kindOfFile(file.name, file.type)
      if (!kind) throw new Error(t('nlm.err.unknown'))
      const label = { name: file.name, size: formatSize(file.size) }
      if (kind === 'csv') {
        const { parseCsv } = await import('../../databases/csv')
        const text = await file.text()
        setCsvText(text)
        const rows = parseCsv(text).rows
        const { looksLikeCards } = await import('./parse')
        const as = looksLikeCards(rows) ? 'cards' : 'table'
        setCsvAs(as)
        await fromRows(rows, as)
      } else if (kind === 'report') {
        await planText(await file.text(), 'report')
      } else if (kind === 'picture') {
        let size = { width: 0, height: 0 }
        try {
          const bmp = await createImageBitmap(file)
          size = { width: bmp.width, height: bmp.height }
          bmp.close()
        } catch {
          /* the cost line then assumes a normal picture */
        }
        setPlan({
          kind,
          file,
          size,
          what: t('nlm.what.picture', label),
        })
      } else {
        setPlan({
          kind,
          file,
          what: t(`nlm.what.${kind as 'audio' | 'video' | 'slides'}`, label),
        })
      }
    } catch (e) {
      setPlan(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const planText = async (text: string, as: PasteKind) => {
    const parse = await import('./parse')
    if (!text.trim()) throw new Error(t('nlm.err.empty'))
    if (as === 'cards' || as === 'quiz') {
      const cards =
        as === 'cards' ? parse.parseFlashcards(text) : parse.parseQuizText(text)
      if (!cards.length) throw new Error(t('nlm.err.noCards'))
      setPlan({
        kind: as,
        cards,
        what: t('nlm.what.cards', { count: cards.length }),
      })
    } else if (as === 'table') {
      const table = parse.parseTable(text)
      if (!table.body.length) throw new Error(t('nlm.err.empty'))
      setPlan({
        kind: 'table',
        table,
        what: t('nlm.what.table', {
          rows: table.body.length,
          columns: table.headers.length,
        }),
      })
    } else if (as === 'mindmap') {
      const { fromOutline } = await import('../../editor/mindMap/model')
      const count = fromOutline(text).nodes.length
      if (count < 2) throw new Error(t('nlm.err.empty'))
      setPlan({
        kind: 'mindmap',
        text,
        what: t('nlm.what.mindmap', { count }),
      })
    } else {
      const { markdownToBlocks } = await import('../../editor/textBlocks')
      const count = markdownToBlocks(text).length
      if (!count) throw new Error(t('nlm.err.empty'))
      setPlan({
        kind: 'report',
        text,
        what: t('nlm.what.report', { count }),
      })
    }
  }

  const previewPaste = () => {
    setError('')
    setRebuild(false)
    planText(pasted, pasteKind).catch((e) => {
      setPlan(null)
      setError(e instanceof Error ? e.message : String(e))
    })
  }

  const changeCsv = async (as: 'cards' | 'table') => {
    setCsvAs(as)
    setError('')
    try {
      const { parseCsv } = await import('../../databases/csv')
      await fromRows(parseCsv(csvText).rows, as)
    } catch (e) {
      setPlan(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const wantRebuild = async (on: boolean) => {
    setRebuild(on)
    if (!on || !plan?.file || !plan.size) return setCostLine('')
    const { rebuildBlocker, rebuildConfig, rebuildCostLine } =
      await import('./rebuild')
    const target = pageIdOk || pages?.[0]?.id
    const why = target ? await rebuildBlocker(db, target) : 'notReady'
    if (why && pageIdOk) return setCostLine(t('nlm.pic.noAi'))
    if (why === 'notReady') return setCostLine(t('nlm.pic.noAi'))
    const config = await rebuildConfig(db, target ?? '')
    setCostLine(
      t('nlm.pic.cost', {
        cost: rebuildCostLine(
          config,
          plan.size.width || 1000,
          plan.size.height || 800,
        ),
      }),
    )
  }

  const add = async () => {
    const chosen = plan
    if (!chosen) return
    if (!activeNotebook) return setError(t('nlm.err.noPages'))
    setBusy(t('nlm.reading'))
    setError('')
    try {
      const run = await import('./run')
      const target = await run.resolveTarget(db, {
        notebookId: activeNotebook,
        pageId: pageIdOk || null,
        title: t('nlm.newPageTitle'),
      })
      const { page, newPage } = target
      let made: NlmMade
      try {
        switch (chosen.kind) {
          case 'audio': {
            const ms = await audioLength(chosen.file!)
            made = await run.importAudio(db, page, chosen.file!, ms, newPage)
            break
          }
          case 'video':
            made = await run.importVideo(db, page, chosen.file!, newPage)
            break
          case 'slides':
            made = await run.importSlides(db, page, chosen.file!, newPage)
            break
          case 'picture': {
            const { shrinkImage } = await import('../../images/shrinkImage')
            made = await run.importPicture(
              db,
              page,
              chosen.file!,
              newPage,
              shrinkImage,
            )
            if (rebuild) made = await rebuildInto(run, page, chosen, made)
            break
          }
          case 'cards':
          case 'quiz':
            made = await run.importCards(db, page, chosen.cards!, newPage)
            break
          case 'table':
            made = await run.importTable(
              db,
              workspaceId,
              page,
              chosen.table!.headers,
              chosen.table!.body,
              chosen.file?.name.replace(/\.[^.]+$/, '') ?? '',
              newPage,
            )
            break
          case 'mindmap':
            made = await run.importMindMap(db, page, chosen.text!, newPage)
            break
          default:
            made = await run.importReport(db, page, chosen.text!, newPage)
        }
      } catch (e) {
        // Nothing half-made stays behind: a page this import made goes again.
        if (newPage)
          await run.undoImport(db, run.emptyMade(page.id)).catch(() => {})
        throw e
      }
      setPlan(null)
      setPasted('')
      ui.toast(
        t('nlm.done', {
          page: page.title || t('review.untitled'),
          what: chosen.what,
        }),
        {
          label: t('nlm.undo'),
          onSelect: () => void run.undoImport(db, made),
        },
      )
    } catch (e) {
      fail(e)
    } finally {
      setBusy('')
    }
  }

  const rebuildInto = async (
    run: typeof import('./run'),
    page: Parameters<typeof import('./run').importMindMap>[1],
    chosen: Plan,
    made: NlmMade,
  ): Promise<NlmMade> => {
    const { rebuildMindMap } = await import('./rebuild')
    setBusy(t('nlm.rebuilding'))
    const outline = await rebuildMindMap(db, page.id, chosen.file!)
    const map = await run.importMindMap(db, page, outline, false)
    return { ...made, blockIds: [...made.blockIds, ...map.blockIds] }
  }

  const pickedPages = useMemo(() => pages ?? [], [pages])

  return (
    <section
      aria-label={t('nlm.title')}
      className={`${box} ${over ? 'outline-2 outline-accent' : ''}`}
      data-nlm-import
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer.files[0]
        if (file) void planFile(file)
      }}
    >
      <h2 className="text-[15px] font-semibold">{t('nlm.title')}</h2>
      <p className="text-sm text-muted">{t('nlm.text')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t('nlm.notebook')}
          value={activeNotebook}
          onChange={(e) => {
            setNotebookId(e.target.value)
            setPageId('')
          }}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 text-[13px]"
        >
          {notebooks.map((n) => (
            <option key={n.id} value={n.id}>
              {sampleName(n) || t('review.untitled')}
            </option>
          ))}
        </select>
        <select
          aria-label={t('nlm.page')}
          value={pageIdOk}
          onChange={(e) => setPageId(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 text-[13px]"
        >
          <option value="">{t('nlm.newPage')}</option>
          {pickedPages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || t('review.untitled')}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <FileButton
          label={t('nlm.chooseFile')}
          hint={t('nlm.fileHint')}
          accept="audio/*,video/*,.m4a,.wav,.mp3,.mp4,.pdf,.pptx,.png,.jpg,.jpeg,.webp,.csv,.tsv,.txt,.md"
          disabled={!!busy}
          onFile={(f) => void planFile(f)}
        />
        <span className="self-center text-xs text-muted">{t('nlm.drop')}</span>
      </div>
      <label className="grid gap-1 text-[13px]">
        {t('nlm.pasteLabel')}
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-line bg-bg p-2 text-[13px]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t('nlm.pasteAs')}
          value={pasteKind}
          onChange={(e) => setPasteKind(e.target.value as PasteKind)}
          className="min-h-11 rounded-lg border border-line bg-bg px-2 text-[13px]"
        >
          {PASTE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`nlm.kind.${k}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!!busy || !pasted.trim()}
          onClick={previewPaste}
          className="min-h-11 rounded-lg border border-line px-3 text-[13px] hover:bg-hover disabled:opacity-50"
        >
          {t('nlm.pasteButton')}
        </button>
      </div>
      {busy && (
        <p role="status" className="text-sm text-muted">
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {plan && (
        <div
          data-nlm-preview
          className="grid gap-2 rounded-lg border border-line bg-soft p-3"
        >
          <p className="text-sm">
            {t('nlm.preview', {
              page:
                pickedPages.find((p) => p.id === pageIdOk)?.title ||
                t('nlm.newPage'),
              what: plan.what,
            })}
          </p>
          {csvText && (plan.kind === 'cards' || plan.kind === 'table') && (
            <label className="flex items-center gap-2 text-[13px]">
              {t('nlm.csvAs')}
              <select
                value={csvAs}
                onChange={(e) =>
                  void changeCsv(e.target.value as 'cards' | 'table')
                }
                className="min-h-11 rounded-lg border border-line bg-bg px-2"
              >
                <option value="cards">{t('nlm.csv.cards')}</option>
                <option value="table">{t('nlm.csv.table')}</option>
              </select>
            </label>
          )}
          {plan.kind === 'picture' && (
            <fieldset className="grid gap-1 text-[13px]">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="nlm-pic"
                  checked={!rebuild}
                  onChange={() => void wantRebuild(false)}
                />
                {t('nlm.pic.only')}
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="nlm-pic"
                  checked={rebuild}
                  onChange={() => void wantRebuild(true)}
                />
                {t('nlm.pic.rebuild')}
              </label>
              {rebuild && costLine && (
                <p className="text-xs text-muted">{costLine}</p>
              )}
            </fieldset>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void add()}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('nlm.add')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlan(null)
                setCsvText('')
              }}
              className="min-h-11 rounded-lg px-3 text-sm text-muted hover:bg-hover"
            >
              {t('nlm.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
