/** A type guard for a string that must be one of `values`. */
export const isOneOfStrings =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    values.includes(v as T)
