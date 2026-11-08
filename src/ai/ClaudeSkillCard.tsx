import { t } from '../i18n/t'

/** Settings › AI › Use with Claude: the free Skill (zip built at build time). */
export function ClaudeSkillCard() {
  return (
    <div
      data-testid="claude-skill"
      className="flex flex-col gap-2 rounded-lg border border-line p-3"
    >
      <h3 className="text-sm font-semibold">{t('claudeSkill.title')}</h3>
      <p className="text-sm text-muted">{t('claudeSkill.intro')}</p>
      <a
        href="/learning-notes-skill.zip"
        download="learning-notes-skill.zip"
        data-testid="claude-skill-download"
        className="inline-flex min-h-11 items-center self-start rounded-lg border border-line px-3 text-sm hover:bg-hover"
      >
        {t('claudeSkill.download')}
      </a>
      <p className="text-sm font-medium">{t('claudeSkill.how')}</p>
      <ol className="ml-5 list-decimal text-sm text-muted">
        <li>{t('claudeSkill.step1')}</li>
        <li>{t('claudeSkill.step2')}</li>
        <li>{t('claudeSkill.step3')}</li>
        <li>{t('claudeSkill.step4')}</li>
      </ol>
    </div>
  )
}
