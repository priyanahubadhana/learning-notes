import type { Edit } from './inkDoc'

/**
 * One Undo/Redo for text and ink together.
 *
 * The text editor keeps its own history (ProseMirror). Ink edits are kept
 * here, each stamped with the text history's depth when it was made. Undo
 * undoes the newest thing of the two: if text was typed after the newest ink
 * edit (the text depth is higher than the stamp) that is undone first, else
 * the ink edit. Redo mirrors it. Ink is one step per stroke or per erase,
 * never per point.
 */

interface Entry {
  edit: Edit
  depth: number
  /** The text step made right after this ink edit belongs to it (one Undo). */
  chain?: boolean
}

export class InkHistory {
  private undoStack: Entry[] = []
  private redoStack: Entry[] = []
  /** Most steps kept. */
  static readonly LIMIT = 200

  push(edit: Edit, textDepth: number): void {
    this.undoStack.push({ edit, depth: textDepth })
    if (this.undoStack.length > InkHistory.LIMIT) this.undoStack.shift()
    this.redoStack = []
  }

  /** Marks the newest ink edit as having a text step right after it. */
  chainTop(): void {
    const top = this.undoStack[this.undoStack.length - 1]
    if (top) top.chain = true
  }

  /** Is the newest step an ink edit plus the one text step made after it? */
  undoIsChained(textDepth: number): boolean {
    const top = this.undoStack[this.undoStack.length - 1]
    return !!top?.chain && textDepth === top.depth + 1
  }

  /** Is the next Redo an ink edit that has a text step to redo after it? */
  redoIsChained(): boolean {
    return !!this.redoStack[this.redoStack.length - 1]?.chain
  }

  /** Which history does Undo use now? */
  undoTarget(textDepth: number): 'ink' | 'text' {
    const top = this.undoStack[this.undoStack.length - 1]
    return top && textDepth <= top.depth ? 'ink' : 'text'
  }

  /** Which history does Redo use now? */
  redoTarget(textDepth: number): 'ink' | 'text' {
    const top = this.redoStack[this.redoStack.length - 1]
    return top && top.depth === textDepth ? 'ink' : 'text'
  }

  /** Takes the newest ink edit off (to revert it). */
  takeUndo(): Edit | undefined {
    const e = this.undoStack.pop()
    if (!e) return undefined
    this.redoStack.push(e)
    return e.edit
  }

  takeRedo(): Edit | undefined {
    const e = this.redoStack.pop()
    if (!e) return undefined
    this.undoStack.push(e)
    return e.edit
  }

  /** The newest ink edit, without taking it (null when none). */
  peekUndo(): Edit | null {
    return this.undoStack[this.undoStack.length - 1]?.edit ?? null
  }

  /** Forgets the newest ink edit (a tap taken back: not a Redo step). */
  dropTop(): Edit | undefined {
    return this.undoStack.pop()?.edit
  }

  /** New text typed after an Undo: the ink Redo steps no longer fit. */
  forgetRedo(): void {
    this.redoStack = []
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0
  }
  get size(): number {
    return this.undoStack.length
  }
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
