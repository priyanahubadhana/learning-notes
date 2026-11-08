/**
 * English text of redesign step 3: the ink engine (drawing on pages),
 * layers, the lasso on ink. Spread into `en` (en.ts); Hindi and Spanish are
 * hi10.ts and es10.ts.
 */
export const en10 = {
  // ---- The drawing region ----
  'ink.region': 'Drawing on this page. Strokes: {n}',
  'ink.region.step':
    'Select drawn strokes. Arrow keys choose a stroke, Delete removes it, Escape lets go.',
  'ink.region.selected': 'Stroke {at} selected',
  'ink.locked': 'Unlock a layer to draw.',
  'ink.layer.default': 'Layer {n}',
  'ink.page.highlights': 'Highlights',
  'ink.hl.saved': 'Saved to Highlights',

  // ---- The menu over selected ink ----
  'ink.sel.menu': 'Selected drawing',
  'ink.sel.hint':
    'Drag the box to move. Drag a corner to resize. Drag the round handle to turn.',
  'ink.sel.duplicate': 'Duplicate',
  'ink.sel.delete': 'Delete',
  'ink.sel.colour': 'Colour',
  'ink.sel.copyPng': 'Copy as picture',
  'ink.sel.savePng': 'Save as picture',
  'ink.sel.scale': 'Resize',
  'ink.sel.rotate': 'Turn',
  'ink.sel.move': 'Move',
  'ink.sel.copied': 'Picture copied',
  'ink.sel.saved': 'Picture saved',
  'ink.sel.copyFailed': 'The picture could not be copied. Try Save as picture.',
  'ink.sel.count_one': '{count} stroke selected',
  'ink.sel.count_other': '{count} strokes selected',
  'ink.sel.textOnly': 'This works on drawings: select ink with the Lasso.',

  // ---- Layers ----
  'tool.inkLayers': 'Ink layers',
  'main.card.pen.layers': 'Layers',
  'main.card.highlighter.layers': 'Layers',
  'main.card.lasso.layers': 'Layers',
  'ink.layers': 'Layers',
  'ink.layers.count': 'Layers ({n})',
  'ink.layers.add': 'Add a layer',
  'ink.layers.max': 'That is the most layers a page can have.',
  'ink.layers.name': 'Layer name',
  'ink.layers.show': 'Show {name}',
  'ink.layers.hide': 'Hide {name}',
  'ink.layers.lock': 'Lock {name}',
  'ink.layers.unlock': 'Unlock {name}',
  'ink.layers.up': 'Move {name} up',
  'ink.layers.down': 'Move {name} down',
  'ink.layers.delete': 'Delete {name}',
  'ink.layers.deleted': 'Layer deleted. Undo brings it back.',
  'ink.layers.draw': 'Draw on {name}',
  'ink.layers.drawing': 'Drawing here',
  'ink.layers.strokes_one': '{count} stroke',
  'ink.layers.strokes_other': '{count} strokes',
  'ink.layers.empty': 'No layers yet. The first stroke makes one.',
  'ink.layers.selectAll': 'Select all in {name}',
  'ink.paper': 'Paper behind the ink',
  'ink.paper.blank': 'Blank',
  'ink.paper.lined': 'Lined',
  'ink.paper.grid': 'Grid',
  'ink.paper.dots': 'Dots',
  'ink.asDrawn': 'View as drawn',
  'ink.asDrawn.note':
    'Shows the ink exactly as it was drawn, even if the text size changed. Comes with the reader.',

  // ---- Pen settings added in step 3 ----
  'ink.pen.shapeSnap': 'Snap shapes',
  'ink.pen.shapeSnap.note':
    'Lines turn to straight angles, squares and circles stay even.',
  'ink.pen.shapeFill': 'Fill shapes',
  'ink.pen.shapeFill.note': 'Closed shapes are filled with a light tint.',
  'ink.finger': 'Finger can draw',
  'ink.finger.auto': 'Automatic',
  'ink.finger.on': 'Always',
  'ink.finger.off': 'Never',
  'ink.finger.note':
    'Automatic: a finger scrolls once a Pencil is used or in Pencil mode, and draws otherwise.',

  // ---- Help tips ----
}
