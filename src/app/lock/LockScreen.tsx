import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState, type ReactNode } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { lockRoot } from '../../core/lock/lockService'
import { lockIsSetUp } from '../../core/lock/lockConfig'
import { isUnlocked, unlock, unlockedIds } from '../../core/lock/lockState'
import { HelpLine } from '../../help/Help'
import { t } from '../../i18n/t'
import { AppUiContext } from '../appUi'
import { ForgotDialog } from './LockDialogs'
import { UnlockForm } from './UnlockForm'
import { useLockMethods } from './useLock'

/**
 * The screen shown instead of locked content. Nothing of the content is
 * read or drawn behind it; only the title (with a 🔒) is shown.
 */
export function LockScreen({
  db,
  rootId,
  title,
  kind,
  compact,
}: {
  db: LearningNotesDB
  rootId: string
  title: string
  kind: 'page' | 'notebook' | 'database'
  compact?: boolean
}) {
  const methods = useLockMethods(db)
  const [forgot, setForgot] = useState(false)
  const { toast } = useContext(AppUiContext)
  if (!methods) return null
  return (
    <div
      data-testid="lock-screen"
      contentEditable={false}
      className={`mx-auto flex max-w-[420px] flex-col items-center justify-center gap-4 px-4 text-center ${compact ? 'py-4' : 'min-h-[60vh] py-10'}`}
    >
      <span aria-hidden className="text-4xl">
        🔒
      </span>
      <h1 className="text-2xl font-semibold break-words">
        <span aria-hidden>🔒 </span>
        {title || t('review.untitled')}
      </h1>
      <p className="text-sm text-muted">{t(`lock.locked.${kind}`)}</p>
      <HelpLine id="lock.privacy" className="text-xs text-muted" />
      <UnlockForm
        db={db}
        methods={methods}
        onUnlocked={() => unlock(rootId)}
        onForgot={() => setForgot(true)}
      />
      {forgot && (
        <ForgotDialog
          db={db}
          methods={methods}
          rootId={rootId}
          onClose={() => setForgot(false)}
          onDone={(what) => {
            setForgot(false)
            toast(
              t(what === 'removed' ? 'lock.removed' : 'lock.forgot.unlocked'),
            )
          }}
        />
      )}
    </div>
  )
}

/**
 * Shows `children` unless the thing is locked (and the lock is set up) and
 * has not been unlocked. `children` is only created while unlocked, so a
 * locked page's text is never loaded or drawn.
 */
export function LockGate({
  db,
  rootId,
  title,
  kind,
  compact,
  children,
}: {
  db: LearningNotesDB
  /** The id that carries the lock, or null when nothing is locked. */
  rootId: string | null
  title: string
  kind: 'page' | 'notebook' | 'database'
  compact?: boolean
  children: ReactNode
}) {
  const methods = useLockMethods(db)
  unlockedIds.useValue() // redraw when unlocked or locked again
  if (!rootId) return <>{children}</>
  if (!methods) return null
  if (!lockIsSetUp(methods) || isUnlocked(rootId)) return <>{children}</>
  return (
    <LockScreen
      db={db}
      rootId={rootId}
      title={title}
      kind={kind}
      compact={compact}
    />
  )
}

/** Gate for a page: its own lock, else its notebook's, else its database's. */
export function PageGate({
  db,
  page,
  children,
}: {
  db: LearningNotesDB
  page: Page
  children: ReactNode
}) {
  const notebook = useLiveQuery(
    () => db.notebooks.get(page.notebookId),
    [db, page.notebookId],
  )
  const database = useLiveQuery(
    async () =>
      page.databaseId ? await db.databases.get(page.databaseId) : null,
    [db, page.databaseId],
  )
  // Not known yet: show nothing rather than a flash of the text.
  if (notebook === undefined || database === undefined) return null
  return (
    <LockGate
      db={db}
      rootId={lockRoot(page, notebook, database ?? undefined)}
      title={page.title}
      kind={page.locked ? 'page' : notebook?.locked ? 'notebook' : 'database'}
    >
      {children}
    </LockGate>
  )
}

/** Gate for a database screen or a database inside a note. */
export function DatabaseGate({
  db,
  databaseId,
  compact,
  children,
}: {
  db: LearningNotesDB
  databaseId: string
  compact?: boolean
  children: ReactNode
}) {
  const database = useLiveQuery(
    async () => (await db.databases.get(databaseId)) ?? null,
    [db, databaseId],
  )
  if (database === undefined) return null
  return (
    <LockGate
      db={db}
      rootId={database?.locked ? database.id : null}
      title={database?.title ?? ''}
      kind="database"
      compact={compact}
    >
      {children}
    </LockGate>
  )
}
