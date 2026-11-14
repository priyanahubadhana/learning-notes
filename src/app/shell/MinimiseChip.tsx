import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import './shell-parts.css'

/** The one top-layer element that stacks every chip (created on first use). */
function chipDock(): HTMLElement {
  let dock = document.querySelector<HTMLElement>('[data-chip-dock]')
  if (dock) return dock
  const layer = document.createElement('div')
  layer.className = 'sh-layer'
  layer.setAttribute('popover', 'manual')
  layer.setAttribute('data-chip-layer', '')
  dock = document.createElement('div')
  dock.className = 'sh-chips'
  dock.setAttribute('data-chip-dock', '')
  layer.appendChild(dock)
  document.body.appendChild(layer)
  try {
    layer.showPopover?.()
  } catch {
    // Not supported: the dock stays fixed on the page.
  }
  return dock
}

/**
 * SH-13: a bar that is minimised becomes a chip on the right edge, 64 px
 * below the top bar. Several chips stack 8 px apart; a tap restores only
 * that bar.
 */
export function MinimiseChip({
  label,
  icon,
  onRestore,
  testId = 'minimise-chip',
  ariaLabel,
}: {
  label: string
  icon?: ReactNode
  testId?: string
  /** The spoken name; by default "Show <label>". */
  ariaLabel?: string
  onRestore: () => void
}) {
  return createPortal(
    <button
      type="button"
      className="sh-chip"
      data-testid={testId}
      aria-label={ariaLabel ?? t('shell.chip.show', { name: label })}
      onClick={onRestore}
    >
      <span aria-hidden="true">‹</span>
      {icon}
      <span>{label}</span>
    </button>,
    chipDock(),
  )
}
