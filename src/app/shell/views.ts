import { t } from '../../i18n/t'
import type { Level } from '../../settings/level'

export interface ViewChoice {
  id: Level
  label: string
}

/** The two views of the shell (SH-06). Settings keep their own three levels. */
export const defaultViews = (): ViewChoice[] => [
  { id: 'beginner', label: t('shell.view.beginner') },
  { id: 'professional', label: t('shell.view.pro') },
]

/** `beg` or `pro`: the value of `data-mode` on the shell root. */
export const modeOf = (level: Level): 'beg' | 'pro' =>
  level === 'beginner' ? 'beg' : 'pro'
