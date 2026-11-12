export function parseProFeatures(
  markdown: string,
): { id: string; group: string }[]
export function renderProFeatures(
  entries: { id: string; group: string }[],
): string
