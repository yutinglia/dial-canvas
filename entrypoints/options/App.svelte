<script lang="ts">
  /**
   * Thin options shell — primary settings live on the new tab page.
   */
  import { t } from '../../lib/i18n';
</script>

<main class="mx-auto max-w-lg p-8">
  <h1 class="mb-2 text-xl font-medium">{t('extName')}</h1>
  <p class="mb-6 text-sm text-[var(--text-muted)]">
    {t('optionsIntro')}
  </p>
  <ol class="list-decimal space-y-2 pl-5 text-sm text-[var(--text-muted)]">
    <li>{t('optionsStepOpenTab')}</li>
    <li>
      {t('optionsStepClickEditBefore')}
      <strong class="text-[var(--dial-title)]">{t('edit')}</strong>
    </li>
    <li>
      {t('optionsStepUseSettingsBefore')}
      <strong class="text-[var(--dial-title)]">{t('settings')}</strong>
      {t('optionsStepUseSettingsAfter')}
    </li>
  </ol>
  <p class="mt-6 text-xs text-[var(--text-muted)]">
    {t('optionsShortcuts')}
  </p>
</main>
