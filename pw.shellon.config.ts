import base from './playwright.config'
const cfg = { ...base }
const proj = (base.projects ?? []).filter((p) => p.name === 'chromium').map((p) => ({
  ...p,
  use: {
    ...p.use,
    storageState: {
      cookies: [],
      origins: (p.use?.storageState as any ?? (base.use as any).storageState).origins.map((o: any) => ({
        ...o,
        localStorage: [...o.localStorage, { name: 'learning-notes:flags', value: '["foundation.shell"]' }],
      })),
    },
  },
}))
export default { ...cfg, projects: proj }
