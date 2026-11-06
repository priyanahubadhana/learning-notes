/**
 * English text of Phase A (trustworthy Pencil): Pencil lab, About this app,
 * layers, own selection, backspace, bar fixes. Hindi and Spanish are hi12.ts
 * and es12.ts (machine drafts: mark for native review).
 */
export const en12 = {
  // ---- Pencil lab ----
  'settings.pencilLab.label': 'Pencil lab',
  'settings.pencilLab.description':
    'A test page that records what the iPad sends while you write and tap with the Pencil. Use it when text appears by itself.',
  'settings.pencilLab.button': 'Open Pencil lab',
  'lab.title': 'Pencil lab',
  'lab.needNotebook': 'Make a notebook first, then open the Pencil lab again.',
  'lab.copyFailed': 'Copy this text and send it:',
  'lab.hide': 'Hide',
  'lab.show': 'Show',
  'lab.scribbleWrote': 'Text written into the page: {count}',
  'lab.mode': 'Page mode',
  'lab.hover': 'Pencil hover moves',
  'lab.viewport': 'Viewport (height / top / scroll)',
  'lab.focus': 'Last focus',
  'lab.switches': 'Switch a protection off to compare',
  'lab.sw.policy': 'Page not editable while drawing',
  'lab.sw.penTap': 'Bar taps handled by the app',
  'lab.sw.touch': 'Pencil touch cancelled on the drawing pad',
  'lab.copy': 'Copy results',
  'lab.copied': 'Copied',
  // ---- About this app ----
  'about.title': 'About this app',
  'about.version': 'Version {commit}, built {date}',
  'about.lastChecked': 'Last checked for updates: {time}',
  'about.neverChecked': 'Not checked for updates yet.',
  'about.check': 'Check for updates now',
  'about.checking': 'Checking…',
  'about.ready': 'Update ready. Use the Update button at the top.',
  'about.current': 'Up to date.',
  'about.failed': 'Could not check. Are you offline?',
  // ---- Layers ----
  'ink.layer.isLocked': '{name} is locked',
  'ink.layer.isHidden': '{name} is hidden',
  'ink.layers.unlockAction': 'Unlock',
  'ink.layers.showAction': 'Show',
  'ink.layers.mergeTitle': 'Merge layers?',
  'ink.layers.mergeWarning':
    'The drawings of the top layer move into the layer below. They cannot be separated later, but you can Undo right away.',
  'ink.layers.merge': 'Merge',
  'ink.layers.merged': 'Layers merged.',
  'ink.layers.mergeInto': 'Merge {from} into {into}',
  'ink.layers.mergeExtras': 'Merge extras into Layer 2',
  'ink.layers.old': 'This page has {count} layers from an earlier version.',
  'ink.layers.page': 'Page (the text)',
  'ink.layers.addTwo': 'Add Layer 2',
  'ink.layers.hiddenBadge': '{name} hidden',
} as const
