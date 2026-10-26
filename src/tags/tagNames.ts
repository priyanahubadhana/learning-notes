/**
 * How tag names are written. Pure functions shared by the pickers and the
 * tag service, so typing a tag and storing it always agree.
 *
 * - A name keeps the case it was first typed in ("Heart-Sounds").
 * - Spaces become "-" (a tag never contains a space), "#" is dropped.
 * - "/" separates levels: "medicine/cardio" is "cardio" inside "medicine".
 * - Two names that differ only in case or accents are the same tag.
 */

import { fold } from '../search/searchText'

/** Longest name of one level. */
export const TAG_NAME_MAX = 60

/** One level's name as stored: no "#" or "/", spaces → "-". */
export function cleanTagName(text: string): string {
  return text
    .replace(/[#/]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, TAG_NAME_MAX)
}

/** The levels of a typed tag path, cleaned; empty levels left out. */
export function splitTagPath(text: string): string[] {
  return text
    .replace(/^#+/, '')
    .split('/')
    .map(cleanTagName)
    .filter((part) => part !== '')
}

/** Key for "the same tag": case and accents ignored. */
export const tagKey = (name: string): string => fold(name)

/** A path as shown: "medicine/cardio". */
export const joinTagPath = (names: readonly string[]): string => names.join('/')
