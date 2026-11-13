import { allToolsGroups } from '../insert/insertModel'
import { ToolTiles } from '../insert/ToolTiles'
import '../toolCards.css'
import '../text/textCards.css'

/** All tools (Professional, tb.allTools): the old Ribbon, every group of every tab. */
export default function AllToolsCard() {
  return (
    <div className="v8scroll v8thin" data-testid="v8-alltools">
      <ToolTiles groups={allToolsGroups()} withTab />
    </div>
  )
}
