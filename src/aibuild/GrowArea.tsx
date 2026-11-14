import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

/**
 * A text box that grows with its text, like the goal box: no browser resize
 * grip. Very long text (a prompt) stops at a cap and scrolls inside.
 */
export function GrowArea({
  className = '',
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      className={`${className} aifw-grow aifw-grow-cap`}
      {...rest}
    />
  )
}
