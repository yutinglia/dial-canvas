<script lang="ts">
  import type { Background } from '../../lib/schemas/settings';
  import type { WallpaperInfoWidget as WallpaperInfoWidgetModel } from '../../lib/schemas/widget';
  import { formatWallpaperInfo } from '../../lib/widgets/wallpaperInfo';
  import { t } from '../../lib/i18n';

  interface Props {
    widget: WallpaperInfoWidgetModel;
    background: Background;
  }

  let { widget, background }: Props = $props();

  const info = $derived(
    formatWallpaperInfo(background, {
      showCopyright: widget.showCopyright,
    }),
  );

  const titleFontSize = $derived(
    widget.fontSize !== undefined
      ? `${Math.max(12, Math.round(widget.fontSize * 0.55))}px`
      : undefined,
  );
</script>

<div class="flex h-full min-h-0 w-full flex-col justify-center gap-1 px-3 py-2">
  <div class="text-xs uppercase tracking-wide text-[var(--text-muted)]">
    {t('widgetWallpaperInfo')}
  </div>
  <div
    class="font-medium text-[var(--dial-title)]"
    class:text-sm={titleFontSize === undefined}
    style:font-size={titleFontSize}
  >
    {info.title}
  </div>
  {#if info.subtitle}
    <div class="text-xs leading-snug text-[var(--text-muted)] line-clamp-3">
      {info.subtitle}
    </div>
  {/if}
  {#if info.empty}
    <div class="text-xs text-[var(--text-muted)]">
      {t('wallpaperInfoWaiting')}
    </div>
  {/if}
</div>
