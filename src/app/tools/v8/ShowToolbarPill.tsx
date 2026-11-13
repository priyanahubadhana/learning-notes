import type { ReactNode } from 'react'
import { MinimiseChip } from '../../shell/MinimiseChip'
import { useFlag } from '../../flags'
import { t } from '../../../i18n/t'
import { useShowBarButton } from '../toolbarVisibility'
import { tuckState } from './tuck'
import { showFromPill } from './useTuck'

/**
 * BUG-003: the one "Show toolbar" pill. With toolbar.v8 it is the shared
 * minimise chip (right edge, top layer, always visible, drawn in the theme's
 * own colours); without the flag the top bar keeps its old button.
 * It shows when the bar is off in Settings or tucked away while writing.
 */
export function ShowToolbarPill({ fallback }: { fallback: ReactNode }) {
  const v8 = useFlag('toolbar.v8')
  const off = useShowBarButton()
  const tucked = tuckState.useValue().tucked
  if (!v8) return off ? <>{fallback}</> : null
  if (!off && !tucked) return null
  return (
    <MinimiseChip
      label={t('v8.bar.show')}
      testId="show-tool-bar"
      ariaLabel={t('v8.bar.show')}
      onRestore={showFromPill}
    />
  )
}
