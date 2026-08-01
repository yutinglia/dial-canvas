<script lang="ts">
  import { dialBackgroundCss, dialBackgroundHoverCss } from '../lib/schemas/dial';
  import type { Background } from '../lib/schemas/settings';
  import type { Widget } from '../lib/schemas/widget';
  import { t } from '../lib/i18n';
  import ClockWidgetView from './widgets/ClockWidget.svelte';
  import WeatherWidgetView from './widgets/WeatherWidget.svelte';
  import NoteWidgetView from './widgets/NoteWidget.svelte';
  import TodoWidgetView from './widgets/TodoWidget.svelte';
  import CalendarWidgetView from './widgets/CalendarWidget.svelte';
  import HolidaysWidgetView from './widgets/HolidaysWidget.svelte';
  import WallpaperInfoWidgetView from './widgets/WallpaperInfoWidget.svelte';
  import ItemCenterCross from './ItemCenterCross.svelte';

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
    background?: Background;
    onEdit: (widget: Widget) => void;
    onPatch?: (widget: Widget) => void;
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
    background,
    onEdit,
    onPatch,
    onMoveStart,
    onResizeStart,
    onContextMenu,
  }: Props = $props();

  const customBackground = $derived(
    dialBackgroundCss(widget.backgroundColor, widget.backgroundOpacity),
  );
  const customBackgroundHover = $derived(
    dialBackgroundHoverCss(widget.backgroundColor, widget.backgroundOpacity),
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

  const ariaLabelKey: Record<Widget['type'], string> = {
    clock: 'widgetClock',
    weather: 'widgetWeather',
    note: 'widgetNote',
    todo: 'widgetTodo',
    calendar: 'widgetCalendar',
    holidays: 'widgetHolidays',
    wallpaperInfo: 'widgetWallpaperInfo',
  };

  const shellClass =
    'group absolute z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--dial-border)] bg-[var(--dial-bg)] transition-[box-shadow,opacity,background,border-color] hover:bg-[var(--dial-bg-hover)] hover:border-[rgba(255,255,255,0.18)]';
</script>

{#snippet widgetBody()}
  {#if widget.type === 'clock'}
    <ClockWidgetView {widget} />
  {:else if widget.type === 'weather'}
    <WeatherWidgetView
      {widget}
      onSetLocation={editMode ? () => onEdit(widget) : undefined}
    />
  {:else if widget.type === 'note'}
    <NoteWidgetView
      {widget}
      {editMode}
      onPatch={
        onPatch
          ? (next) => onPatch(next)
          : undefined
      }
    />
  {:else if widget.type === 'todo'}
    <TodoWidgetView
      {widget}
      onPatch={onPatch ? (next) => onPatch(next) : undefined}
    />
  {:else if widget.type === 'calendar'}
    <CalendarWidgetView {widget} />
  {:else if widget.type === 'holidays'}
    <HolidaysWidgetView
      {widget}
      onSetCountry={() => onEdit(widget)}
    />
  {:else if background}
    <WallpaperInfoWidgetView {widget} {background} />
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
    style:background={preview ? 'rgba(107, 143, 113, 0.18)' : undefined}
    style:--dial-bg={preview ? undefined : customBackground}
    style:--dial-bg-hover={preview ? undefined : customBackgroundHover}
    style:border-color={preview ? 'var(--accent)' : undefined}
    style:opacity={dimmed ? 0.28 : preview ? 0.85 : 1}
    style:box-shadow={selected ? '0 0 0 1px var(--accent)' : 'none'}
    style:cursor={cursor}
    role="button"
    tabindex="0"
    onpointerdown={(e) => {
      if ((e.target as HTMLElement).closest('[data-handle]')) return;
      if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
        onMoveStart(widget, e);
        return;
      }
      if ((e.target as HTMLElement).closest('input, textarea, button, select, a, [data-interactive]')) {
        return;
      }
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

    <ItemCenterCross />

    <div
      data-drag-handle
      class="absolute top-0.5 left-1/2 z-20 flex h-4 w-12 -translate-x-1/2 cursor-grab items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
      class:opacity-100={selected || dragging}
      role="presentation"
      onpointerdown={(e) => {
        e.stopPropagation();
        onMoveStart(widget, e);
      }}
    >
      <span
        class="block h-1 w-6 rounded-full bg-[var(--dial-title)] opacity-45"
        aria-hidden="true"
      ></span>
    </div>

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
    style:--dial-bg={customBackground}
    style:--dial-bg-hover={customBackgroundHover}
    style:opacity={dimmed ? 0.28 : 1}
    style:cursor={cursor}
    role="group"
    aria-label={t(ariaLabelKey[widget.type])}
    oncontextmenu={(e) => onContextMenu(widget, e)}
    ondblclick={(e) => {
      e.preventDefault();
      onEdit(widget);
    }}
  >
    {@render widgetBody()}
  </div>
{/if}
