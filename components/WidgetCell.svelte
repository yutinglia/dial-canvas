<script lang="ts">
  import { dialBackgroundCss } from '../lib/schemas/dial';
  import type { Widget } from '../lib/schemas/widget';
  import { t } from '../lib/i18n';
  import ClockWidgetView from './widgets/ClockWidget.svelte';
  import WeatherWidgetView from './widgets/WeatherWidget.svelte';

  type ResizeHandle =
    | 'n'
    | 's'
    | 'e'
    | 'w'
    | 'ne'
    | 'nw'
    | 'se'
    | 'sw';

  interface Props {
    widget: Widget;
    editMode: boolean;
    selected?: boolean;
    preview?: boolean;
    dragging?: boolean;
    dimmed?: boolean;
    onEdit: (widget: Widget) => void;
    onMoveStart: (widget: Widget, event: PointerEvent) => void;
    onResizeStart: (
      widget: Widget,
      handle: ResizeHandle,
      event: PointerEvent,
    ) => void;
    onContextMenu: (widget: Widget, event: MouseEvent) => void;
  }

  let {
    widget,
    editMode,
    selected = false,
    preview = false,
    dragging = false,
    dimmed = false,
    onEdit,
    onMoveStart,
    onResizeStart,
    onContextMenu,
  }: Props = $props();

  const customBackground = $derived(
    dialBackgroundCss(widget.backgroundColor, widget.backgroundOpacity),
  );

  const cursor = $derived(
    !editMode ? 'default' : dragging ? 'grabbing' : 'grab',
  );

  const handles: ResizeHandle[] = [
    'n',
    's',
    'e',
    'w',
    'ne',
    'nw',
    'se',
    'sw',
  ];

  function handleStyle(handle: ResizeHandle): string {
    const edge = '8px';
    const positions: Record<ResizeHandle, string> = {
      n: `top:-4px;left:50%;width:40%;height:${edge};transform:translateX(-50%);cursor:ns-resize`,
      s: `bottom:-4px;left:50%;width:40%;height:${edge};transform:translateX(-50%);cursor:ns-resize`,
      e: `right:-4px;top:50%;width:${edge};height:40%;transform:translateY(-50%);cursor:ew-resize`,
      w: `left:-4px;top:50%;width:${edge};height:40%;transform:translateY(-50%);cursor:ew-resize`,
      ne: `top:-4px;right:-4px;width:12px;height:12px;cursor:nesw-resize`,
      nw: `top:-4px;left:-4px;width:12px;height:12px;cursor:nwse-resize`,
      se: `bottom:-4px;right:-4px;width:12px;height:12px;cursor:nwse-resize`,
      sw: `bottom:-4px;left:-4px;width:12px;height:12px;cursor:nesw-resize`,
    };
    return positions[handle];
  }

  const shellClass =
    'group absolute z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--dial-border)] bg-[var(--dial-bg)] transition-[box-shadow,opacity,background,border-color] hover:bg-[var(--dial-bg-hover)] hover:border-[rgba(255,255,255,0.18)]';
</script>

{#snippet widgetBody()}
  {#if widget.type === 'clock'}
    <ClockWidgetView {widget} />
  {:else}
    <WeatherWidgetView
      {widget}
      onSetLocation={editMode ? () => onEdit(widget) : undefined}
    />
  {/if}
{/snippet}

{#if editMode}
  <div
    class={shellClass}
    class:ring-2={selected}
    style:left="{widget.x}px"
    style:top="{widget.y}px"
    style:width="{widget.width}px"
    style:height="{widget.height}px"
    style:background={preview
      ? 'rgba(107, 143, 113, 0.18)'
      : customBackground}
    style:border-color={preview ? 'var(--accent)' : undefined}
    style:opacity={dimmed ? 0.28 : preview ? 0.85 : 1}
    style:box-shadow={selected ? '0 0 0 1px var(--accent)' : 'none'}
    style:cursor={cursor}
    role="button"
    tabindex="0"
    onpointerdown={(e) => {
      if ((e.target as HTMLElement).closest('[data-handle]')) return;
      onMoveStart(widget, e);
    }}
    ondblclick={(e) => {
      e.preventDefault();
      onEdit(widget);
    }}
    oncontextmenu={(e) => onContextMenu(widget, e)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEdit(widget);
      }
    }}
  >
    {@render widgetBody()}

    <button
      type="button"
      class="absolute top-1.5 right-1.5 z-20 rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      style:cursor="pointer"
      title={t('editWidget')}
      onclick={(e) => {
        e.stopPropagation();
        onEdit(widget);
      }}
    >
      {t('edit')}
    </button>

    {#each handles as handle (handle)}
      <div
        class="absolute z-20 rounded-sm bg-[var(--accent)]"
        data-handle={handle}
        style={handleStyle(handle)}
        onpointerdown={(e) => {
          e.stopPropagation();
          onResizeStart(widget, handle, e);
        }}
        role="presentation"
      ></div>
    {/each}
  </div>
{:else}
  <div
    class={shellClass}
    style:left="{widget.x}px"
    style:top="{widget.y}px"
    style:width="{widget.width}px"
    style:height="{widget.height}px"
    style:background={customBackground}
    style:opacity={dimmed ? 0.28 : 1}
    style:cursor={cursor}
    role="group"
    aria-label={widget.type === 'clock' ? t('widgetClock') : t('widgetWeather')}
    oncontextmenu={(e) => onContextMenu(widget, e)}
    ondblclick={(e) => {
      e.preventDefault();
      onEdit(widget);
    }}
  >
    {@render widgetBody()}
  </div>
{/if}
