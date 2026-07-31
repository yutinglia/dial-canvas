<script lang="ts">
  /**
   * Thin options shell — primary settings live on the new tab page.
   */
  import { t } from '../../lib/i18n';
</script>

<main class="mx-auto max-w-lg p-8">
  <h1 class="mb-2 text-xl font-medium">{t('extName')}</h1>
  <p class="mb-6 text-sm text-[var(--text-muted)]">
    Layout, dials, backup (import/export), wallpaper, and pages are edited on
    the new tab page. Use the always-visible Edit control, then Settings.
  </p>
  <ol class="list-decimal space-y-2 pl-5 text-sm text-[var(--text-muted)]">
    <li>Open a new tab</li>
    <li>
      Click <strong class="text-[var(--dial-title)]">{t('edit')}</strong>
    </li>
    <li>
      Use <strong class="text-[var(--dial-title)]">{t('settings')}</strong> for
      grid, wallpaper, and JSON backup
    </li>
  </ol>
  <p class="mt-6 text-xs text-[var(--text-muted)]">
    Shortcuts: Alt+E toggle edit · Alt+A add dial · Alt+F search
  </p>
</main>
