/** One changed database row, kept in a step so it can be undone. */
export interface RowChange {
  /** Table name. */
  t: string
  id: string
  /** c: created, u: updated fields, d: deleted. */
  k: 'c' | 'u' | 'd'
  /** The whole row (created or deleted). */
  row?: Record<string, unknown>
  /** Updated: the changed fields before and after (and fields that did not exist). */
  b?: FieldSet
  a?: FieldSet
  /** The row before the change (used to find its page; not saved). */
  before?: Record<string, unknown>
}

export interface FieldSet {
  set: Record<string, unknown>
  del: string[]
}
