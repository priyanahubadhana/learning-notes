import { AI_TOOLS } from './registry'
import type { CatalogTool } from './types'

/**
 * The catalog: every tool without its test examples, as plain JSON. The
 * catalog screen, the planner prompt and the MCP tool list are all drawn from
 * `catalog.gen.json` (written by `npm run aitools:catalog`), so they cannot
 * drift from the definitions.
 */
export function toCatalog(): CatalogTool[] {
  return AI_TOOLS.map((tool) => {
    const { examples, ...rest } = tool
    void examples
    return JSON.parse(JSON.stringify(rest)) as CatalogTool
  })
}
