import type { CardFace as Face } from '../../../recall/reviewService'

/** The faces that exist today: question and answer (also vocabulary), fill in the blank, picture. */
export type FaceType = 'qa' | 'blank' | 'picture'

export function faceType(face: Face): FaceType {
  if (face.kind === 'blank') return 'blank'
  return face.answer.some((b) => b.image) ? 'picture' : 'qa'
}
