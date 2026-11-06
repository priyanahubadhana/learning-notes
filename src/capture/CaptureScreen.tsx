import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { isHttpsUrl } from '../core/sourceCheck'
import { t } from '../i18n/t'
import { bookmarkletHref, captureAddress } from './bookmarklet'
import {
  CaptureError,
  captureKind,
  captureSource,
  type CaptureInput,
} from './captureService'
import { NotesPanel } from './NotesPanel'
import { formatTime, parseYoutube } from './youtube'

/**
 * The Capture inbox (CR1): paste a link, a transcript or an article and keep
 * it as a source page. Opens prefilled from `#/capture?url=&title=&text=`
 * (the iOS Shortcut and the bookmarklet use that address).
 */
export function CaptureScreen({
  db,
  workspaceId,
  draft,
  onOpenPage,
  onClose,
}: {
  db: LearningNotesDB
  workspaceId: string
  draft?: CaptureInput
  onOpenPage: (pageId: string) => void
  onClose: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const [url, setUrl] = useState(draft?.url ?? '')
  const [title, setTitle] = useState(draft?.title ?? '')
  const [text, setText] = useState(draft?.text ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const input: CaptureInput = { url, title, text }
  const yt = isHttpsUrl(url.trim()) ? parseYoutube(url.trim()) : null
  const kind = captureKind(input)

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      const page = await captureSource(db, workspaceId, input)
      toast(t('capture.saved', { title: page.title }))
      onOpenPage(page.id)
    } catch (e) {
      if (e instanceof CaptureError) setError(e.message)
      else throw e
    } finally {
      setSaving(false)
    }
  }

  const field =
    'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent'
  return (
    <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 md:px-12 md:pt-12">
      <div className="mb-3 flex items-start gap-2">
        <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
          {t('capture.title')}
        </h1>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {t('capture.back')}
        </button>
      </div>
      <p className="mb-2 text-sm text-muted">{t('capture.intro')}</p>
      <p className="mb-5 text-xs text-muted">{t('capture.limit')}</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void runTask(save())
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          {t('capture.url')}
          <input
            type="url"
            inputMode="url"
            value={url}
            placeholder={t('capture.urlPlaceholder')}
            onChange={(e) => setUrl(e.target.value)}
            data-testid="capture-url"
            className={field}
          />
        </label>
        {yt && (
          <p className="text-xs text-muted">
            {t('capture.fromYoutube', {
              id: yt.videoId,
              time: formatTime(yt.startSec),
            })}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          {t('capture.titleField')}
          <input
            type="text"
            value={title}
            placeholder={t('capture.titlePlaceholder')}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="capture-title"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('capture.text')}
          <textarea
            rows={10}
            value={text}
            placeholder={t('capture.textPlaceholder')}
            onChange={(e) => setText(e.target.value)}
            data-testid="capture-text"
            className={field}
          />
        </label>
        {(url || text) && (
          <p className="text-xs text-muted">
            {t('capture.detected', { kind: t(`capture.kind.${kind}`) })}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          data-testid="capture-save"
          className="min-h-11 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('capture.save')}
        </button>
      </form>
      <NotesPanel
        db={db}
        workspaceId={workspaceId}
        input={input}
        onDone={onOpenPage}
      />
      <WaysIn />
    </div>
  )
}

/** The iOS Shortcut recipe and the bookmarklet. */
function WaysIn() {
  const link = useRef<HTMLAnchorElement>(null)
  const appUrl = location.href
  useEffect(() => {
    // Set by hand: React refuses `javascript:` addresses.
    link.current?.setAttribute('href', bookmarkletHref(appUrl))
  }, [appUrl])
  return (
    <section className="mt-10 border-t border-line pt-5">
      <h2 className="mb-3 text-base font-semibold">{t('capture.ways')}</h2>
      <h3 className="text-sm font-medium">{t('capture.shortcut')}</h3>
      <p className="mb-1 text-sm text-muted">{t('capture.shortcutHelp')}</p>
      <code
        data-testid="capture-address"
        className="mb-4 block overflow-x-auto rounded bg-soft px-2 py-1 text-xs"
      >
        {`${captureAddress(appUrl)}?url=…&title=…&text=…`}
      </code>
      <h3 className="text-sm font-medium">{t('capture.bookmarklet')}</h3>
      <p className="mb-2 text-sm text-muted">{t('capture.bookmarkletHelp')}</p>
      <a
        ref={link}
        draggable
        onClick={(e) => e.preventDefault()}
        className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm"
      >
        {t('capture.bookmarkletLabel')}
      </a>
    </section>
  )
}
