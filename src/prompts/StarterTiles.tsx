import { Icon, type IconName } from '../app/tools/icons'
import { t } from '../i18n/t'
import type { PromptItem } from './promptModel'
import './StarterTiles.css'

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

/**
 * The library's "Pick" part (slice 15, ST12): 160 x 112 tiles, picture on
 * top, name below, one Run button. Two per row on a phone.
 */
export function StarterTiles({
  items,
  onRun,
}: {
  items: PromptItem[]
  onRun: (item: PromptItem) => void
}) {
  return (
    <ul className="starter-tiles" data-testid="starter-tiles">
      {items.map((item) => {
        const icon = STARTER_TILES.find((s) => s.id === item.starterId)?.icon
        return (
          <li key={item.id} className="starter-tile" data-testid="starter-tile">
            <span className="starter-tile__pic" aria-hidden>
              {icon && <Icon name={icon} size={22} />}
            </span>
            <span className="starter-tile__name">{item.name}</span>
            <button
              type="button"
              className="starter-tile__run"
              aria-label={t('st12.runNamed', { name: item.name })}
              onClick={() => onRun(item)}
            >
              {t('st12.run')}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
