<script lang="ts">
  import { t } from '../lib/i18n';

  const HOMEPAGE_URL = 'https://github.com/yutinglia/dial-canvas';
  const PRIVACY_URL =
    'https://github.com/yutinglia/dial-canvas/blob/main/PRIVACY.md';
  const LICENSE_URL =
    'https://github.com/yutinglia/dial-canvas/blob/main/LICENSE';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  const version = $derived(browser.runtime.getManifest().version);

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    onclick={onClose}
    onkeydown={onKeydown}
  >
    <div
      class="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg p-4 shadow-xl"
      style:background="#1e2229"
      style:border="1px solid var(--dial-border)"
      role="dialog"
      aria-modal="true"
      aria-label={t('about')}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onKeydown}
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-base font-medium text-[var(--dial-title)]">
          {t('about')}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-[var(--text-muted)]"
          onclick={onClose}
        >
          {t('close')}
        </button>
      </div>

      <p class="text-sm font-medium text-[var(--dial-title)]">{t('extName')}</p>
      <p class="mt-1 text-xs text-[var(--text-muted)]">
        {t('aboutVersion', version)}
      </p>
      <p class="mt-3 text-sm text-[var(--text-muted)]">{t('extDescription')}</p>
      <p class="mt-3 text-xs text-[var(--text-muted)]">{t('aboutLicenseMit')}</p>

      <div class="mt-4 flex flex-col gap-2">
        <a
          class="rounded-md px-3 py-2 text-sm text-[var(--dial-title)] transition-colors hover:bg-white/5"
          style:border="1px solid var(--dial-border)"
          href={HOMEPAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('aboutHomepage')}
        </a>
        <a
          class="rounded-md px-3 py-2 text-sm text-[var(--dial-title)] transition-colors hover:bg-white/5"
          style:border="1px solid var(--dial-border)"
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('aboutPrivacy')}
        </a>
        <a
          class="rounded-md px-3 py-2 text-sm text-[var(--dial-title)] transition-colors hover:bg-white/5"
          style:border="1px solid var(--dial-border)"
          href={LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('aboutLicense')}
        </a>
      </div>
    </div>
  </div>
{/if}
