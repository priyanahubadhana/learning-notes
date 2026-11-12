import { t } from '../../i18n/t'

/**
 * "Restore original" (Reader v2) keeps ONE extra copy of a book on this device
 * (`BookFile.original`). Above this size the copy is not kept: the person is
 * told plainly BEFORE the first edit, and Undo still works.
 */
export const ORIGINAL_CAP_BYTES = 200_000_000

/** Can the first copy of a book of `size` bytes be kept? */
export function canKeepOriginal(size: number): boolean {
  return Number.isFinite(size) && size >= 0 && size <= ORIGINAL_CAP_BYTES
}

/**
 * The plain-words notice to show before any page edit, or null when the
 * original can be kept (nothing to say).
 */
export function originalCapNotice(size: number): string | null {
  if (canKeepOriginal(size)) return null
  return t('readerv2.original.tooBig', {
    size: `${Math.round(size / 1_000_000)} MB`,
  })
}
