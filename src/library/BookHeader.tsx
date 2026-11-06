import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { dateLocale, t } from '../i18n/t'
import { imageRef } from '../images/imageRef'
import { useImageUrl } from '../images/useImageUrl'
import { runTask } from '../app/errors'
import { continueTarget, progressPercent, readStatus } from './libraryService'
import { isHttpsUrl } from '../core/sourceCheck'

/**
 * The top of a source page (book, video, article …): cover, author, a big
 * Continue button, progress and the original link. Shown by the page view
 * above the notes when `Page.source` is set.
 */
export function BookHeader({
  db,
  page,
  onRead,
  onOpenPage,
  actions,
}: {
  db: LearningNotesDB
  page: Page
  onRead: (pageId: string, at?: string) => void
  onOpenPage: (pageId: string) => void
  /** Extra buttons (Copy prompt, Paste notes …) from the capture feature. */
  actions?: React.ReactNode
}) {
  const source = page.source
  const cover = useImageUrl(
    source?.coverImageId ? imageRef(source.coverImageId) : null,
  )
  if (!source) return null
  const isBook = source.kind === 'book'
  const percent = progressPercent(source)
  const status = readStatus(source)
  const canRead =
    isBook && (source.format === 'pdf' || source.format === 'epub')
  return (
    <section
      data-chrome
      aria-label={t('library.headerLabel')}
      className="mb-5 flex gap-4 rounded-xl border border-line bg-soft p-3"
    >
      {cover && (
        <img
          src={cover}
          alt={t('library.cover', { title: page.title })}
          className="h-28 w-20 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-xs text-muted">
          {t(`library.kind.${source.kind}`)}
          {source.author ? ` · ${source.author}` : ''}
          {source.pageCount
            ? ` · ${t('library.pages', { count: source.pageCount })}`
            : ''}
        </p>
        {isBook && (
          <div className="flex items-center gap-2">
            <div
              role="progressbar"
              aria-label={t('library.progressLabel', { percent })}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-32 overflow-hidden rounded-full bg-line"
            >
              <div
                className="h-full bg-accent"
                style={{ inlineSize: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-muted">
              {t('library.progress', { percent })}
            </span>
          </div>
        )}
        {source.openedAt && (
          <p className="text-xs text-muted">
            {t('library.lastRead', {
              when: new Date(source.openedAt).toLocaleDateString(dateLocale()),
            })}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          {isBook && (
            <button
              type="button"
              data-testid="book-continue"
              onClick={() =>
                runTask(
                  (async () => {
                    const target = await continueTarget(db, page)
                    if (target.kind === 'read') onRead(page.id, target.at)
                    else onOpenPage(target.id)
                  })(),
                )
              }
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              {status === 'finished'
                ? t('library.readAgain')
                : canRead
                  ? `▶ ${t('library.continue')}`
                  : t('library.open')}
            </button>
          )}
          {source.url && isHttpsUrl(source.url) && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm hover:bg-hover"
            >
              {t('library.openLink')}
            </a>
          )}
          {actions}
        </div>
      </div>
    </section>
  )
}
