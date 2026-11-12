import { t } from '../../../i18n/t'

/** The new tool bar (toolbar.v8). Slice 1a: an empty frame, loaded lazily. */
export default function ToolbarV8() {
  return (
    <div
      data-testid="toolbar-v8"
      role="toolbar"
      aria-label={t('bar.v8Label')}
      className="flex min-h-11 items-center"
    />
  )
}
