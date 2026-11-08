import { memStore } from './store'

/**
 * Insert › Handwriting (polish 2, item 10): one entry that explains the three
 * ways to turn handwriting into text. The chooser itself
 * (HandwritingChooser.tsx) is a late-loaded chunk; this tiny store is what
 * the tool registry and the app share.
 */
export const handwritingChooser = memStore(false)

export const openHandwritingChooser = (): void => handwritingChooser.set(true)
