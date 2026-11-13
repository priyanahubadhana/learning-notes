import { useUnlocked } from '../../../../../settings/level'
import { insertGroups } from './insertModel'
import { ToolTiles } from './ToolTiles'
import '../toolCards.css'
import '../text/textCards.css'

/** Insert (1f): the Insert tab's tools in groups of 44 pt tiles; Professional adds more. */
export default function InsertCards() {
  const insertMore = useUnlocked('tb.insertMore')
  return (
    <div className="v8scroll v8thin" data-testid="v8-insert">
      <ToolTiles groups={insertGroups({ insertMore })} />
    </div>
  )
}
