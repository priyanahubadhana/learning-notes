/** SP-06 Drag: words for the grip, the move buttons and the screen-reader messages. */
export const enPartsDrag = {
  'parts.drag.grip': 'Drag {name} to reorder',
  'parts.drag.up': 'Move {name} up',
  'parts.drag.down': 'Move {name} down',
  'parts.drag.moved': '{name} moved to position {pos} of {total}',
  'parts.drag.lifted': '{name} picked up. Use the arrow keys, or let go to drop.',
  'parts.drag.failed': 'Could not drop {name} there. It went back.',
  'parts.drag.list': 'Reorderable list',
  'parts.drag.galIdle': 'List, idle',
  'parts.drag.galHold': 'Hold pending (press ring)',
  'parts.drag.galLifted': 'Lifted, drop-line shows the landing',
  'parts.drag.galInvalid': 'Invalid slot (snaps to the nearest that fits)',
  'parts.drag.galGrid': 'Grid, live reflow with a wide item',
  'parts.drag.galEnds': 'Up on the first and down on the last are off',
  'parts.drag.galHelp':
    'Drag by the grip, hold a row for 0.3 seconds, or press Alt with the arrow keys.',
  'parts.drag.wide': 'Wide',
  'parts.drag.small': 'Small',
  'parts.drag.last': 'Last moved: {name}',
  'parts.drag.none': 'No move yet',
} as const
