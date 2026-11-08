import { useState } from 'react'
import { PROVIDER_IDS } from '../ai/provider'
import { MODELS } from '../ai/models'
import { t, type MessageKey } from '../i18n/t'
import {
  INPUT_KINDS,
  OUTPUT_KINDS,
  PURPOSES,
  SKILL_PARTS,
  starText,
  subjectList,
  versionStats,
  type PromptItem,
  type SkillPart,
} from './promptModel'

const field = 'min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-sm'
const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'

/**
 * The editor of one prompt or skill: every column of its database row. The
 * old text of a changed prompt is kept as a version (see the list at the
 * bottom; Restore puts an old text back into the box, Save keeps it).
 */
export function PromptEdit({
  item,
  onSave,
  onDelete,
  onCancel,
}: {
  item: PromptItem
  onSave: (next: PromptItem) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(item)
  const [subjects, setSubjects] = useState(item.subjects.join(', '))
  const set = <K extends keyof PromptItem>(k: K, v: PromptItem[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))
  const togglePart = (p: SkillPart) =>
    set(
      'parts',
      draft.parts.includes(p)
        ? draft.parts.filter((x) => x !== p)
        : SKILL_PARTS.filter((x) => x === p || draft.parts.includes(x)),
    )
  const models = MODELS.filter(
    (m) => draft.provider === '' || m.provider === draft.provider,
  )
  const label = (key: MessageKey, child: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{t(key)}</span>
      {child}
    </label>
  )
  return (
    <div className="flex flex-col gap-3" data-testid="prompt-edit">
      {label(
        'prompts.col.name',
        <input
          className={field}
          data-testid="prompt-name"
          value={draft.name}
          maxLength={200}
          onChange={(e) => set('name', e.target.value)}
        />,
      )}
      <div className="grid grid-cols-2 gap-2">
        {label(
          'prompts.col.kind',
          <select
            className={field}
            value={draft.kind}
            onChange={(e) => {
              const kind = e.target.value === 'skill' ? 'skill' : 'prompt'
              setDraft((d) => ({
                ...d,
                kind,
                parts:
                  kind === 'skill' && d.parts.length === 0
                    ? [...SKILL_PARTS]
                    : d.parts,
                output:
                  kind === 'skill'
                    ? 'studySet'
                    : d.output === 'studySet'
                      ? 'answer'
                      : d.output,
              }))
            }}
          >
            <option value="prompt">{t('prompts.kind.prompt')}</option>
            <option value="skill">{t('prompts.kind.skill')}</option>
          </select>,
        )}
        {label(
          'prompts.col.purpose',
          <select
            className={field}
            value={draft.purpose}
            onChange={(e) =>
              set('purpose', e.target.value as PromptItem['purpose'])
            }
          >
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {t(`prompts.purpose.${p}` as MessageKey)}
              </option>
            ))}
          </select>,
        )}
        {label(
          'prompts.col.input',
          <select
            className={field}
            value={draft.input}
            onChange={(e) =>
              set('input', e.target.value as PromptItem['input'])
            }
          >
            {INPUT_KINDS.map((p) => (
              <option key={p} value={p}>
                {t(`prompts.input.${p}` as MessageKey)}
              </option>
            ))}
          </select>,
        )}
        {label(
          'prompts.col.output',
          <select
            className={field}
            value={draft.output}
            onChange={(e) =>
              set('output', e.target.value as PromptItem['output'])
            }
          >
            {OUTPUT_KINDS.map((p) => (
              <option key={p} value={p}>
                {t(`prompts.output.${p}` as MessageKey)}
              </option>
            ))}
          </select>,
        )}
      </div>
      {label(
        'prompts.col.subjects',
        <input
          className={field}
          data-testid="prompt-subjects"
          value={subjects}
          placeholder={t('prompts.subjectsHint')}
          onChange={(e) => {
            setSubjects(e.target.value)
            set('subjects', subjectList(e.target.value))
          }}
        />,
      )}
      {label(
        'prompts.col.text',
        <textarea
          className={`${field} min-h-40 py-2`}
          data-testid="prompt-text"
          value={draft.text}
          maxLength={20000}
          onChange={(e) => set('text', e.target.value)}
        />,
      )}
      {draft.kind === 'skill' && (
        <fieldset className="rounded-lg border border-line p-2">
          <legend className="px-1 text-sm text-muted">
            {t('prompts.col.parts')}
          </legend>
          <div className="flex flex-wrap gap-x-4">
            {SKILL_PARTS.map((p) => (
              <label
                key={p}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-5"
                  checked={draft.parts.includes(p)}
                  onChange={() => togglePart(p)}
                />
                {t(`prompts.part.${p}` as MessageKey)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid grid-cols-2 gap-2">
        {label(
          'prompts.col.provider',
          <select
            className={field}
            value={draft.provider}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                provider: (e.target.value || '') as PromptItem['provider'],
                model: '',
              }))
            }
          >
            <option value="">{t('prompts.anyProvider')}</option>
            {PROVIDER_IDS.map((p) => (
              <option key={p} value={p}>
                {t(`ai.provider.${p}` as MessageKey)}
              </option>
            ))}
          </select>,
        )}
        {label(
          'prompts.col.model',
          <select
            className={field}
            value={draft.model}
            onChange={(e) => set('model', e.target.value)}
          >
            <option value="">{t('prompts.anyModel')}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>,
        )}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={draft.usePreferred}
          onChange={(e) => set('usePreferred', e.target.checked)}
        />
        {t('prompts.usePreferred')}
      </label>
      {draft.licence && (
        <p className="text-xs text-muted">
          {t('prompts.col.licence')}: {draft.licence}
        </p>
      )}
      {draft.versions.length > 0 && (
        <details
          className="rounded-lg border border-line p-2 text-sm"
          data-testid="prompt-versions"
        >
          <summary className="min-h-11 cursor-pointer leading-[44px]">
            {t('prompts.versions', { count: draft.versions.length })}
          </summary>
          <ul className="flex flex-col gap-2">
            {versionStats(item)
              .reverse()
              .map((v) => (
                <li key={v.index} className="rounded-lg border border-line p-2">
                  <div className="text-xs text-muted">
                    {v.current
                      ? t('prompts.versionCurrent')
                      : new Date(v.at ?? 0).toLocaleString()}
                    {v.count > 0 &&
                      ` · ${starText(v.average)} ${t('prompts.ratedCount', { count: v.count })}`}
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap">{v.text}</p>
                  {!v.current && (
                    <button
                      type="button"
                      className={btn}
                      onClick={() => set('text', v.text)}
                    >
                      {t('prompts.restoreVersion')}
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </details>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {onDelete && (
          <button type="button" className={`${btn} mr-auto`} onClick={onDelete}>
            {t('prompts.delete')}
          </button>
        )}
        <button type="button" className={btn} onClick={onCancel}>
          {t('annot.cancel')}
        </button>
        <button
          type="button"
          data-testid="prompt-save"
          disabled={!draft.name.trim()}
          onClick={() => onSave(draft)}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('prompts.save')}
        </button>
      </div>
    </div>
  )
}
