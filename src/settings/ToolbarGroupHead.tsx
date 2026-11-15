import { t } from '../i18n/t'

/** The "Tool bar" heading and its line, shown above the Layout row. */
export function ToolbarGroupHead() {
  return (
    <div data-testid="toolbar-group-head" className="sv3-group-head pt-4">
      <h2 className="text-[13px] font-semibold text-muted">
        {t('settings.toolbarGroup.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t('settings.toolbarGroup.lead')}
      </p>
    </div>
  )
}
