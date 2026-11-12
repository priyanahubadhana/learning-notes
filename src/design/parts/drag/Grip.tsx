import type { ButtonHTMLAttributes } from 'react'

/** The 6-dot drag handle (44 x 44 target). Props come from `useReorder().gripProps(id)`. */
export function Grip(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="rord-grip" {...props}>
      <svg viewBox="0 0 12 18" width="12" height="18" aria-hidden="true">
        {[3, 9].flatMap((x) =>
          [3, 9, 15].map((y) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />
          )),
        )}
      </svg>
    </button>
  )
}
