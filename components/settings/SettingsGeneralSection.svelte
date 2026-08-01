<script lang="ts">
  import {
    DEFAULT_SETTINGS,
    type Settings,
  } from '../../lib/schemas/settings';
  import { t } from '../../lib/i18n';

  interface Props {
    settings: Settings;
    onChange: (
      partial: Partial<Settings>,
      opts?: { immediate?: boolean },
    ) => void;
  }

  let { settings, onChange }: Props = $props();

  function resetLocale() {
    onChange({ locale: DEFAULT_SETTINGS.locale }, { immediate: true });
  }
</script>

<section class="mb-6">
  <h3
    class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
  >
    {t('settingsSectionGeneral')}
  </h3>
  <div class="mb-1 block text-sm">
    <div class="mb-1 flex items-center justify-between gap-2">
      <span class="text-[var(--text-muted)]">{t('language')}</span>
      {#if settings.locale !== DEFAULT_SETTINGS.locale}
        <button
          type="button"
          class="rounded px-2 py-0.5 text-xs"
          style:border="1px solid var(--dial-border)"
          style:color="var(--accent)"
          onclick={resetLocale}
        >
          {t('useDefault')}
        </button>
      {/if}
    </div>
    <select
      class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
      style:border-color="var(--dial-border)"
      value={settings.locale}
      onchange={(e) =>
        onChange(
          {
            locale: (e.currentTarget as HTMLSelectElement)
              .value as Settings['locale'],
          },
          { immediate: true },
        )
      }
    >
      <option value="system">{t('languageSystem')}</option>
      <option value="en">{t('languageEn')}</option>
      <option value="zh_TW">{t('languageZhTw')}</option>
    </select>
  </div>
</section>
