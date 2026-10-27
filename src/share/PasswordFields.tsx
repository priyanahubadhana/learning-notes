import { t } from '../i18n/t'
import { MIN_PASSWORD_LENGTH } from './crypto'
import { passwordProblem, type LockState } from './lockState'

/**
 * "Protect this file with a password": a tick box that opens two password
 * fields (typed twice) and a plain warning that a forgotten password means
 * the file is lost for good. The screen blocks saving while
 * `passwordProblem` is not empty.
 */
export function PasswordFields({
  lock,
  onChange,
}: {
  lock: LockState
  onChange: (next: LockState) => void
}) {
  const problem = passwordProblem(lock.password, lock.again)
  const field =
    'min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 text-[13px]'
  const label = t('data.protect.password', { count: MIN_PASSWORD_LENGTH })
  return (
    <div className="mb-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={lock.protect}
          onChange={(e) => onChange({ ...lock, protect: e.target.checked })}
        />
        {t('data.protect')}
      </label>
      {lock.protect && (
        <div className="mt-2 grid gap-2">
          <p
            role="note"
            className="rounded-lg bg-soft p-2.5 text-[13px] leading-relaxed"
          >
            {t('data.protect.warning')}
          </p>
          <input
            type="password"
            autoComplete="new-password"
            aria-label={label}
            placeholder={label}
            value={lock.password}
            onChange={(e) => onChange({ ...lock, password: e.target.value })}
            className={field}
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label={t('data.protect.again')}
            placeholder={t('data.protect.again')}
            value={lock.again}
            onChange={(e) => onChange({ ...lock, again: e.target.value })}
            className={field}
          />
          {problem && lock.password !== '' && (
            <p role="status" className="text-[13px] text-muted">
              {problem}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
