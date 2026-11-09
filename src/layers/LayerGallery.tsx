import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { reportError } from '../app/errors'
import { ConfirmDialog } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { LayerInstall } from '../core/types'
import { t } from '../i18n/t'
import { MAX_BUNDLE_BYTES } from '../share/bundle'
import { FileButton } from '../share/FileButton'
import {
  installLayer,
  listInstalls,
  planRemoval,
  removeLayer,
  type RemovalPlan,
} from './layerService'
import { readLayerFile, type LayerFile } from './manifest'
import {
  STARTER_IDS,
  buildStarter,
  starterManifest,
  type StarterId,
} from './packs'

/**
 * The Layer gallery (quiet corner): starter layers with "what it adds", Add
 * and Remove, and a way to add a layer file a friend shared. Remove takes
 * away only what the layer added and you never changed; if you changed
 * something it says so first.
 */
export function LayerGallery({
  db,
  workspaceId,
  onClose,
}: {
  db: LearningNotesDB
  workspaceId: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const { toast } = useContext(AppUiContext)
  const installs = useLiveQuery(() => listInstalls(db), [db])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState<{
    install: LayerInstall
    plan: RemovalPlan
  } | null>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key)
    setError('')
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      reportError(e)
    } finally {
      setBusy(null)
    }
  }
  const add = (file: LayerFile) =>
    installLayer(db, workspaceId, file).then(() =>
      toast(t('layers.added', { name: file.manifest.name })),
    )
  const remove = (install: LayerInstall, plan: RemovalPlan) =>
    removeLayer(db, install.id).then(() =>
      toast(t('layers.removed', { name: install.name, count: plan.untouched })),
    )
  const askRemove = (install: LayerInstall) =>
    run(install.packId, async () => {
      const plan = await planRemoval(db, install)
      if (plan.changed.length > 0) setAsking({ install, plan })
      else await remove(install, plan)
    })

  const installOf = (packId: string) =>
    installs?.find((i) => i.packId === packId)
  const others = (installs ?? []).filter(
    (i) => !(STARTER_IDS as readonly string[]).includes(i.packId),
  )
  const button =
    'min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover disabled:opacity-50'

  return (
    <dialog
      ref={ref}
      aria-label={t('layers.title')}
      data-testid="layer-gallery"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto max-h-[90vh] w-[min(40rem,94vw)] overflow-y-auto rounded-2xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <div className="mb-1 flex items-start gap-2">
        <h2 className="flex-1 text-lg font-semibold">{t('layers.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('layers.close')}
          className="size-11 rounded-lg text-lg text-muted hover:bg-hover hover:text-ink"
        >
          ×
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">{t('layers.intro')}</p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="mb-4 flex flex-col gap-3">
        {STARTER_IDS.map((id: StarterId) => {
          const manifest = starterManifest(id)
          const install = installOf(id)
          return (
            <li
              key={id}
              data-testid={`layer-${id}`}
              className="rounded-xl border border-line p-3"
            >
              <h3 className="text-[15px] font-semibold">{manifest.name}</h3>
              <p className="mb-2 text-sm text-muted">{manifest.description}</p>
              <p className="text-xs font-medium text-muted">
                {t('layers.whatItAdds')}
              </p>
              <ul className="mb-3 list-disc ps-5 text-sm">
                {manifest.adds.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {install ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => askRemove(install)}
                  className={button}
                >
                  {t('layers.remove')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run(id, async () => add(await buildStarter(id)))
                  }
                  className={`${button} border-accent text-accent`}
                >
                  {busy === id ? t('layers.adding') : t('layers.add')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {others.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-semibold">{t('layers.yours')}</h3>
          <ul className="mb-4 flex flex-col gap-2">
            {others.map((install) => (
              <li
                key={install.id}
                className="flex items-center gap-2 rounded-xl border border-line p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {install.name}
                </span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => askRemove(install)}
                  className={button}
                >
                  {t('layers.remove')}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <FileButton
        label={t('layers.addFile')}
        hint={t('layers.addFileHint')}
        accept=".json,application/json"
        disabled={busy !== null}
        onFile={(file) =>
          run('file', async () => {
            if (file.size > MAX_BUNDLE_BYTES) throw new Error(t('err.tooBig'))
            await add(readLayerFile(await file.text()))
          })
        }
      />
      {asking && (
        <ConfirmDialog
          message={t('layers.askRemove', {
            name: asking.install.name,
            list: asking.plan.changed.join(', '),
          })}
          confirmLabel={t('layers.removeRest')}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            const { install, plan } = asking
            setAsking(null)
            run(install.packId, () => remove(install, plan))
          }}
        />
      )}
    </dialog>
  )
}
