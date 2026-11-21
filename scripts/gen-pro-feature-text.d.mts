export function parseProFeatureText(
  markdown: string,
): { id: string; name: string; does: string }[]
export function renderProFeatureText(
  entries: { id: string; name: string; does: string }[],
): string
