import { t } from '../i18n/t'
import { MIN_PASSWORD_LENGTH } from './crypto'

export interface LockState {
  protect: boolean
  password: string
  again: string
}

export const NO_LOCK: LockState = { protect: false, password: '', again: '' }

/** What is wrong with the chosen password ('' = it can be used). */
export function passwordProblem(password: string, again: string): string {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return t('data.protect.short', { count: MIN_PASSWORD_LENGTH })
  }
  return password === again ? '' : t('data.protect.mismatch')
}
