/**
 * Words for the new Search (flag `search.v2`). Plain words, the same in
 * Beginner and Professional. Read through `ts()` (src/search/v2/ts.ts) until
 * the manager wires this file into the index.
 */
export const enV2Search = {
  'srv2.strip.label': 'Actions for this result',
  'srv2.act.open': 'Open',
  'srv2.act.openNew': 'Open in new place',
  'srv2.act.copyLink': 'Copy link',
  'srv2.act.pin': 'Pin as favourite',
  'srv2.act.unpin': 'Remove from favourites',
  'srv2.linkCopied': 'Link copied',
  'srv2.linkFailed': 'Could not copy the link',
  'srv2.chips': 'Show',
  'srv2.scope': 'Search in',
  'srv2.scope.page': 'This page',
  'srv2.scope.notebook': 'Notebook',
  'srv2.scope.all': 'Everything',
  'srv2.scope.pageCount': 'Matches on this page: {count}',
} as const
