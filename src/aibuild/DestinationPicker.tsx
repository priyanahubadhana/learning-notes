import { OnOffChoice } from '../design/parts/OnOff'
import { t, type MessageKey } from '../i18n/t'
import type { Destination } from './buildState'
import type { DestinationLists } from './destinationLists'

const field =
  'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'

type Kind = Destination['kind']
const DEST_KINDS: readonly Kind[] = ['new_notebook', 'notebook', 'page']

/**
 * Where should it go? The one place picker used by Build and Studio: a new
 * notebook, a notebook you have, or a page.
 */
export function DestinationPicker({
  value,
  lists,
  onChange,
}: {
  value: Destination
  lists: DestinationLists
  onChange: (destination: Destination) => void
}) {
  const dest = value
  const setKind = (kind: Kind) =>
    onChange(
      kind === 'new_notebook'
        ? { kind, title: '' }
        : kind === 'notebook'
          ? { kind, id: '' }
          : { kind, id: '', notebookId: '' },
    )
  return (
    <>
      <OnOffChoice<Kind>
        block
        label={t('aifw.dest.title')}
        value={dest.kind}
        onChange={setKind}
        options={DEST_KINDS.map((k) => ({
          value: k,
          testId: `aifw-dest-kind-${k}`,
          label: t(
            (k === 'new_notebook'
              ? 'aifw.dest.new'
              : k === 'notebook'
                ? 'aifw.dest.notebook'
                : 'aifw.dest.page') as MessageKey,
          ),
        }))}
      />
      {dest.kind === 'new_notebook' && (
        <input
          type="text"
          value={dest.title}
          maxLength={120}
          aria-label={t('aifw.dest.name')}
          placeholder={t('aifw.dest.name')}
          data-testid="aifw-dest-name"
          className={field}
          onChange={(e) =>
            onChange({ kind: 'new_notebook', title: e.target.value })
          }
        />
      )}
      {dest.kind === 'notebook' && (
        <select
          value={dest.id}
          aria-label={t('aifw.dest.pickNotebook')}
          data-testid="aifw-dest-notebook"
          className={field}
          onChange={(e) => onChange({ kind: 'notebook', id: e.target.value })}
        >
          <option value="">{t('aifw.dest.choose')}</option>
          {lists.notebooks?.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
      )}
      {dest.kind === 'page' && (
        <select
          value={dest.id}
          aria-label={t('aifw.dest.pickPage')}
          data-testid="aifw-dest-page"
          className={field}
          onChange={(e) =>
            onChange({
              kind: 'page',
              id: e.target.value,
              notebookId:
                lists.pages?.find((p) => p.id === e.target.value)?.notebookId ??
                '',
            })
          }
        >
          <option value="">{t('aifw.dest.choose')}</option>
          {lists.pages?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      )}
    </>
  )
}
