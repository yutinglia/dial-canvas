<script lang="ts">
  import { t } from '../../lib/i18n';

  interface Props {
    onOpenAbout: () => void;
  }

  let { onOpenAbout }: Props = $props();
</script>

<section class="border-t pt-5" style:border-color="var(--dial-border)">
  <h3
    class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
  >
    {t('settingsSectionAbout')}
  </h3>
  <button
    type="button"
    class="rounded-md px-3 py-1.5 text-sm"
    style:border="1px solid var(--dial-border)"
    onclick={onOpenAbout}
  >
    {t('about')}
  </button>
</section>
