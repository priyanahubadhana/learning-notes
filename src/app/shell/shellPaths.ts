import type { Space } from '../spaces/spaces'

/**
 * The shell's own line icons (docs/design/shell-spec.md section 9): 24 grid,
 * 1.6 stroke, round caps, no fills. Rail picks follow the owner (MF 114):
 * Library = books on a shelf, Notebooks = ruled notebook, Review = repeat
 * arrows around a card; Home, sun, moon and gear as before.
 */
export const SHELL_PATHS = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  library:
    '<path d="M3 20.5h18"/><rect x="4" y="5" width="4" height="12.5" rx="1"/><rect x="8" y="8" width="4" height="9.5" rx="1"/><path d="m13.6 7.4 3.5-1 3 10.2-3.5 1z"/>',
  notebooks:
    '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7.5h4M3 12h4M3 16.5h4"/><path d="M11 8h5M11 12h5M11 16h3"/>',
  review:
    '<path d="M20.5 11A8.5 8.5 0 0 0 5.6 6.4L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M3.5 13a8.5 8.5 0 0 0 14.9 4.6l2.1-2.1"/><path d="M20.5 20.5v-5h-5"/><rect x="9" y="9.5" width="6" height="5" rx="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  gear: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  sidebar:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  panel:
    '<rect x="3" y="4" width="5" height="4" rx="1"/><rect x="3" y="10" width="5" height="4" rx="1"/><rect x="3" y="16" width="5" height="4" rx="1"/><path d="M12 6h9M12 12h9M12 18h6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  fwd: '<path d="m9 18 6-6-6-6"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
} as const

export type ShellIconName = keyof typeof SHELL_PATHS

export const SPACE_SHELL_ICON: Record<Space, ShellIconName> = {
  home: 'home',
  library: 'library',
  notebooks: 'notebooks',
  review: 'review',
}
