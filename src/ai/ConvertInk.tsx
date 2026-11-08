import { useLiveQuery } from 'dexie-react-hooks'
import { createPortal } from 'react-dom'
import { useContext, useEffect, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { PopupHeader } from '../app/tools/PopupClose'
import type { LearningNotesDB } from '../core/db'
import type { Editor } from '../editor/barActions'
import { t } from '../i18n/t'
/** What the sheet needs of the ink (kept small: ai does not import ink). */
interface InkController {
  selected(): { blockId: string | null }[]
  deleteSelection(): void
  undo(): boolean
}
import { aiLockedBlock, blocker, forNotebook, readAiConfig } from './aiRun'
import { AiError, PROVIDERS, type AiImage } from './provider'
import { blobToImage, runVision, type VisionTask } from './vision'

/**
 * Lasso › Convert to text (Phase P). The selected ink becomes a PNG, the user
 * sees exactly that picture and where it goes, then the model returns text.
 * The preview is editable: Insert below, Replace the ink, or Copy. One Undo
 * takes the result back. Lazy-loaded: none of this is in the first download.
 */

export interface ConvertProps {
  db: LearningNotesDB
  pageId: string
  controller: InkController
  editor: Editor
  png: Blob
  /** 'latex' reads handwritten maths into a Formula block. */
  task?: VisionTask
  onClose: () => void
}

export function ConvertInk({
  db,
  pageId,
  controller,
  editor,
  png,
  task: firstTask = 'handwriting',
  onClose,
}: ConvertProps) {
  const { toast } = useContext(AppUiContext)
  const base = readAiConfig()
  const pageNotebook = useLiveQuery(async () => {
    const pg = await db.pages.get(pageId)
    return pg ? db.notebooks.get(pg.notebookId) : undefined
  }, [db, pageId])
  const config = forNotebook(base, pageNotebook)
  const [url] = useState(() => URL.createObjectURL(png))
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [state, setState] = useState<'ask' | 'busy' | 'done'>('ask')
  const [text, setText] = useState('')
  // Where the text goes: after the block the ink sits on (or the page end).
  const [anchor] = useState(
    () => controller.selected().find((p) => p.blockId)?.blockId ?? null,
  )

  const [task, setTask] = useState<VisionTask>(firstTask)
  const send = async (as: VisionTask) => {
    setTask(as)
    const page = await db.pages.get(pageId)
    const notebook = page ? await db.notebooks.get(page.notebookId) : undefined
    const why = blocker(
      config,
      !!notebook?.allowAi,
      await aiLockedBlock(db, pageId),
    )
    if (why) {
      toast(
        t(
          why === 'notReady'
            ? 'ai.convert.needsAi'
            : why === 'lockedOff'
              ? 'ai.lockedOff'
              : 'ai.allowOff',
        ),
      )
      return onClose()
    }
    setState('busy')
    try {
      const image: AiImage = await blobToImage(png)
      const r = await runVision(config, as, image, undefined, undefined, {
        db,
        pageId,
      })
      if (!r.text.trim()) {
        toast(t('ai.convert.empty'))
        return onClose()
      }
      setText(r.text)
      setState('done')
    } catch (e) {
      toast(
        t('ai.failed', {
          reason: e instanceof AiError ? e.message : t('ai.empty'),
        }),
      )
      onClose()
    }
  }

  const insert = (replace: boolean) => {
    const value = text.trim()
    if (!value) return
    const doc = editor.document
    const ref = (anchor && editor.getBlock(anchor)) || doc[doc.length - 1]
    const blocks =
      task === 'latex'
        ? [{ type: 'math', props: { latex: value } }]
        : value
            .split(/\n+/)
            .map((line) => ({ type: 'paragraph', content: line }))
    const made = ref
      ? editor.insertBlocks(blocks as never, ref, 'after')
      : editor.insertBlocks(blocks as never, doc[0], 'before')
    const ids = made.map((b) => b.id)
    if (replace) controller.deleteSelection()
    onClose()
    toast(t('ai.convert.inserted'), {
      label: t('annot.undo'),
      onSelect: () => {
        editor.removeBlocks(ids)
        if (replace) controller.undo()
      },
    })
  }

  const btn =
    'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
  const main =
    'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
  // On the body: the ink layer under the page must not see these taps.
  return createPortal(
    <div
      data-chrome
      data-ink-ui
      role="dialog"
      aria-label={t('ai.convert.title')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-bg p-4 shadow-xl">
        <PopupHeader title={t('ai.convert.title')} onClose={onClose} />
        <img
          src={url}
          alt={t('ai.convert.picture')}
          className="mb-3 max-h-40 w-full rounded-lg border border-line object-contain"
        />
        {state !== 'done' ? (
          <>
            <p className="mb-4 text-sm">
              {t('ai.convert.send', {
                provider: t(`ai.provider.${config.provider}`),
                host: PROVIDERS[config.provider].host,
              })}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onClose} className={btn}>
                {t('annot.cancel')}
              </button>
              <button
                type="button"
                data-testid="ai-convert-maths"
                disabled={state === 'busy'}
                onClick={() => void send('latex')}
                className={btn}
              >
                {t('ai.convert.maths')}
              </button>
              <button
                type="button"
                data-testid="ai-convert-send"
                disabled={state === 'busy'}
                onClick={() => void send('handwriting')}
                className={main}
              >
                {state === 'busy'
                  ? t('ai.convert.reading')
                  : t('ai.convert.go')}
              </button>
            </div>
          </>
        ) : (
          <>
            <label
              className="mb-1 block text-sm text-ink-soft"
              htmlFor="ai-convert-text"
            >
              {t('ai.convert.preview')}
            </label>
            <textarea
              id="ai-convert-text"
              data-testid="ai-convert-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              lang="und"
              className="mb-1 w-full rounded-lg border border-line bg-bg p-2 text-base"
            />
            <p className="mb-3 text-xs text-ink-soft">
              {t('capture.madeWithAi')}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                data-testid="ai-convert-copy"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(text)
                    .then(() => toast(t('ai.convert.copied')))
                    .catch(() => toast(t('ink.sel.copyFailed')))
                  onClose()
                }}
                className={btn}
              >
                {t('ai.convert.copy')}
              </button>
              <button
                type="button"
                data-testid="ai-convert-replace"
                onClick={() => insert(true)}
                className={btn}
              >
                {t('ai.convert.replace')}
              </button>
              <button
                type="button"
                data-testid="ai-convert-insert"
                onClick={() => insert(false)}
                className={main}
              >
                {t('ai.convert.insert')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
