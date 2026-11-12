import { t, type MessageKey } from '../../i18n/t'
import type { enPartsMenus } from '../../i18n/en/parts/menus'

type Strip<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K
export type MenusKey = Strip<keyof typeof enPartsMenus>

/** Text for the Context strip and Command list, through t(). */
export function tm(
  key: MenusKey,
  params?: Record<string, string | number>,
): string {
  return t(key as MessageKey, params)
}
