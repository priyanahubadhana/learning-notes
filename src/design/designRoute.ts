/** The hidden review page lives at `#/design-tokens` (see DesignTokensPage). */
export const isDesignTokensRoute = (hash: string): boolean =>
  hash === '#/design-tokens' || hash.startsWith('#/design-tokens?')
