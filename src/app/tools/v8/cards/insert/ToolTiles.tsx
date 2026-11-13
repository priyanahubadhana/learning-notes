import {
  CardGroup,
  Tile,
  TileGroup,
} from '../../../../../design/parts/CardParts'

import { Icon } from '../../../icons'
import { runTool, toolLabel, tabLabel, groupLabel } from '../../../toolRegistry'
import type { ToolGroup } from './insertModel'

/** One group of tools as 44 pt tiles: icon over name, a tap runs the tool. */
export function ToolTiles({
  groups,
  withTab,
}: {
  groups: ToolGroup[]
  /** Prefix each group with its tab (All tools). */
  withTab?: boolean
}) {
  return (
    <>
      {groups.map((g) => {
        const name = groupLabel(g.id)
        const label = withTab ? `${tabLabel(g.tab)} · ${name}` : name
        return (
          <CardGroup key={`${g.tab}-${g.id}`} label={label}>
            <TileGroup label={label} action columns={3}>
              {g.tools.map((tool) => (
                <Tile
                  key={tool.id}
                  action
                  label={toolLabel(tool)}
                  testId={`v8-tool-tile-${tool.id}`}
                  onSelect={() => runTool(tool.id)}
                >
                  <Icon name={tool.icon} size={22} />
                </Tile>
              ))}
            </TileGroup>
          </CardGroup>
        )
      })}
    </>
  )
}
