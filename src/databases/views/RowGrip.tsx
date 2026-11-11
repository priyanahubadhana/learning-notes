import type { RowReorder } from './useRowReorder'

/** Six dots (as a picture, so it adds no text to the row). */
function GripIcon() {
  return (
    <svg
      aria-hidden
      width="10"
      height="15"
      viewBox="0 0 10 15"
      fill="currentColor"
    >
      {[2, 7.5, 13].map((y) =>
        [2.5, 7.5].map((x) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" />
        )),
      )}
    </svg>
  )
}

/** The grip button of a row (visible on hover, always on touch screens). */
export function RowGrip({
  grip,
  className = '',
}: {
  grip: ReturnType<RowReorder['grip']>
  className?: string
}) {
  return (
    <button
      {...grip}
      className={`-ms-1 me-0.5 inline-flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[13px] leading-none text-muted opacity-0 select-none group-hover/row:opacity-100 hover:bg-hover hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-70 ${className}`}
    >
      <GripIcon />
    </button>
  )
}
