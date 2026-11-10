import { SettingsLink } from '../settings/SettingsLink'
import { sampleName } from '../i18n/defaultNames'
import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { t } from '../i18n/t'
import { listKeys, type AiKey } from './keyStore'
import { MODELS } from './models'

function choiceValue(
  c: { keyId: string; model: string } | undefined,
  keys: readonly AiKey[],
): string {
  return c && keys.some((k) => k.id === c.keyId) ? `${c.keyId}|${c.model}` : ''
}

/**
 * Settings › Permissions (Phase P): every notebook with its AI switch and
 * model choice. Spending and what was sent live in AI › Usage and cost.
 */
export function PermissionsSection({ db }: { db: LearningNotesDB }) {
  const keys = listKeys()
  const notebooks = useLiveQuery(
    async () =>
      (await db.notebooks.toArray())
        .filter(
          (n) =>
            isLive(n) &&
            (!n.kind || n.kind === 'books' || n.kind === 'sources'),
        )
        .sort((a, b) => a.order.localeCompare(b.order)),
    [db],
  )

  return (
    <section
      data-testid="permissions-section"
      className="mb-6 flex flex-col gap-4"
    >
      <h2 className="text-base font-semibold">{t('ai.perm.title')}</h2>
      <p className="text-sm text-muted">{t('ai.perm.intro')}</p>
      <div>
        <h3 className="mb-1 text-sm font-medium">{t('ai.allowTitle')}</h3>
        <ul>
          {(notebooks ?? []).map((n) => (
            <li key={n.id} data-setting-id={`perm.nb.${n.id}`}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  role="switch"
                  checked={!!n.allowAi}
                  data-testid="ai-allow"
                  aria-label={t('ai.allowNotebook', { name: n.title })}
                  onChange={(e) =>
                    void db.notebooks.update(n.id, {
                      allowAi: e.target.checked ? true : undefined,
                      updatedAt: Date.now(),
                    })
                  }
                  className="size-5"
                />
                {sampleName(n) || t('review.untitled')}
              </label>
              {n.allowAi && (
                <label className="ml-8 flex min-h-11 items-center gap-3 text-xs text-muted">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={!!n.allowAiLocked}
                    data-testid="ai-allow-locked"
                    aria-label={t('ai.allowLocked.for', { name: n.title })}
                    onChange={(e) =>
                      void db.notebooks.update(n.id, {
                        allowAiLocked: e.target.checked ? true : undefined,
                        updatedAt: Date.now(),
                      })
                    }
                    className="size-5"
                  />
                  <span>
                    {t('ai.allowLocked')}
                    <span className="block">{t('ai.allowLocked.hint')}</span>
                  </span>
                </label>
              )}
              <label className="mb-2 ml-8 flex flex-wrap items-center gap-2 text-xs text-muted">
                {t('ai.nb.uses')}
                <select
                  data-testid="ai-nb-choice"
                  aria-label={t('ai.nb.choiceFor', { name: n.title })}
                  value={choiceValue(n.aiChoice, keys)}
                  onChange={(e) => {
                    const [keyId, model] = e.target.value.split('|')
                    void db.notebooks.update(n.id, {
                      aiChoice: keyId && model ? { keyId, model } : undefined,
                      updatedAt: Date.now(),
                    })
                  }}
                  className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
                >
                  <option value="">{t('ai.nb.default')}</option>
                  {keys.flatMap((k) =>
                    MODELS.filter((m) => m.provider === k.provider).map((m) => (
                      <option key={k.id + m.id} value={`${k.id}|${m.id}`}>
                        {k.name} · {m.label}
                      </option>
                    )),
                  )}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted" data-testid="perm-usage-link">
        {t('ai.perm.seeUsage')}{' '}
        <SettingsLink to="category:ai" className="text-accent underline">
          {t('ai.perm.openUsage')}
        </SettingsLink>
      </p>
    </section>
  )
}
