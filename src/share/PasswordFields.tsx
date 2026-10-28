import { t } from '../i18n/t'
import { PasswordInput } from './PasswordInput'
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
          <PasswordInput
            autoComplete="new-password"
            label={label}
            placeholder={label}
            value={lock.password}
            onChange={(password) => onChange({ ...lock, password })}
          />
          <PasswordInput
            autoComplete="new-password"
            label={t('data.protect.again')}
            placeholder={t('data.protect.again')}
            value={lock.again}
            onChange={(again) => onChange({ ...lock, again })}
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
