/**
 * English text of Wave 3 part B (picture editor, mind map, embeds, shapes
 * and tools). Hindi and Spanish are hiW3b.ts and esW3b.ts (machine drafts:
 * mark for native review).
 */
export const enW3b = {
  // ---- Picture editor (G0) ----
  'pic.edit': 'Edit picture',
  'pic.rotateLeft': 'Turn left',
  'pic.rotateRight': 'Turn right',
  'pic.straighten': 'Straighten',
  'pic.zoomIn': 'Zoom in',
  'pic.zoomOut': 'Zoom out',
  'pic.shape': 'Crop shape',
  'pic.ratio.free': 'Free',
  'pic.ratio.original': 'Original',
  'pic.reset': 'Reset',
  'pic.save': 'Save',
  'pic.cutOut': 'Cut out as new picture',
  'pic.restore': 'Restore original',
  'pic.corner.nw': 'Crop corner, top left',
  'pic.corner.ne': 'Crop corner, top right',
  'pic.corner.sw': 'Crop corner, bottom left',
  'pic.corner.se': 'Crop corner, bottom right',
  'pic.saved': 'Picture changed. Undo brings the old one back.',
  'pic.cutOutDone': 'Cut-out added below the picture.',
  'pic.restored': 'Original picture restored.',
  'pic.failed': 'This picture could not be edited.',
  'pic.notEditable': 'Only pictures kept in this app can be edited.',

  // ---- Mind map (G0b) ----
  'mm.title': 'Mind map',
  'mm.slash.title': 'Mind map',
  'mm.slash.subtext': 'A tree of ideas you can rearrange',
  'mm.addChild': '+ Branch',
  'mm.addSibling': '+ Beside',
  'mm.delete': 'Delete branch',
  'mm.theme': 'Style',
  'mm.theme.calm': 'Calm',
  'mm.theme.bold': 'Bold',
  'mm.theme.paper': 'Paper',
  'mm.asPicture': 'Save as picture',
  'mm.pictureAdded': 'The mind map was added below as a picture.',
  'mm.pictureFailed': 'The picture could not be made.',
  'mm.topic': 'Central topic',
  'mm.branch': 'Branch',
  'mm.empty': 'Empty branch',
  'mm.editBranch': 'Branch text',
  'mm.hint':
    'Tap a branch, tap again to type. Tab adds a branch, Enter adds one beside it, Delete removes it. Drag a branch onto another to move it. Alt+arrows reorder.',
} as const
