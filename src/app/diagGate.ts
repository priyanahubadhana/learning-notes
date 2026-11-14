/**
 * The one gate: the recorders exist only on the preview address. The caller
 * passes isPreviewHost() from app/flags (the same test the Pencil check uses).
 * Its own tiny file, so the first download carries only this.
 */
export const diagGate = (onPreview: boolean): boolean => onPreview === true
