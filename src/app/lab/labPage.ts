import { memStore } from '../tools/store'

/** The page the Pencil lab opened (its panel shows while that page is open). */
export const labPageId = memStore<string | null>(null)
