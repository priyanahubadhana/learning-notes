import type { IconName } from '../app/tools/icons'
import type { PromptItem } from './promptModel'

/** The six starter prompts Beginner sees (ST12), in this order. */
export const STARTER_TILES: { id: string; icon: IconName }[] = [
  { id: 'own.summarise', icon: 'alignLeft' },
  { id: 'own.keypoints', icon: 'list' },
  { id: 'own.cards', icon: 'cards' },
  { id: 'own.explain', icon: 'lightbulb' },
  { id: 'own.quiz', icon: 'checkSquare' },
  { id: 'own.gaps', icon: 'search' },
]

/** The tiles for the starters found in the library, in the shown order. */
export function starterItems(items: readonly PromptItem[]): PromptItem[] {
  return STARTER_TILES.flatMap(({ id }) => {
    const found = items.find((i) => i.starterId === id)
    return found ? [found] : []
  })
}
