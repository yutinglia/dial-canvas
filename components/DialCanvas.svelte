<script lang="ts">
  import DialCell from './DialCell.svelte';
  import WidgetCell from './WidgetCell.svelte';
  import GridOverlay from './GridOverlay.svelte';
  import type { Dial } from '../lib/schemas/dial';
  import type { Widget } from '../lib/schemas/widget';
  import type { Background, Settings } from '../lib/schemas/settings';
  import {
    clampRect,
    resolveDrop,
    snapRect,
    type Rect,
    type Size,
  } from '../lib/layout';
  import { t } from '../lib/i18n';

  type ResizeHandle =
    | 'n'
    | 's'
    | 'e'
    | 'w'
    | 'ne'
    | 'nw'
    | 'se'
    | 'sw';

  type CanvasKind = 'dial' | 'widget';

  interface Props {
    dials: Dial[];
    widgets?: Widget[];
    settings: Settings;
    editMode: boolean;
    searchQuery?: string;
    onDialsChange: (dials: Dial[], opts?: { immediate?: boolean }) => void;
    onWidgetsChange?: (widgets: Widget[], opts?: { immediate?: boolean }) => void;
    onPatchWidget?: (widget: Widget) => void;
    onEditDial: (dial: Dial) => void;
    onEditWidget?: (widget: Widget) => void;
    onCanvasSizeChange?: (size: Size) => void;
    onContextMenu: (dial: Dial, event: MouseEvent) => void;
    onWidgetContextMenu?: (widget: Widget, event: MouseEvent) => void;
    onCanvasContextMenu?: (
      event: MouseEvent,
      point: { x: number; y: number },
    ) => void;
    onAddDial?: () => void;
    onAddWidget?: () => void;
  }

  let {
    dials,
    widgets = [],
    settings,
    editMode,
    searchQuery = '',
    onDialsChange,
    onWidgetsChange,
    onPatchWidget,
    onEditDial,
    onEditWidget,
    onCanvasSizeChange,
    onContextMenu,
    onWidgetContextMenu,
    onCanvasContextMenu,
    onAddDial,
    onAddWidget,
  }: Props = $props();

  const background = $derived(settings.background as Background);

  let canvasEl: HTMLDivElement | undefined = $state();
  let canvasSize = $state<Size>({ width: 1200, height: 800 });
  let selectedId = $state<string | null>(null);
  let previewById = $state<Record<string, Rect>>({});

  type Interaction =
    | {
        kind: 'move';
        id: string;
        itemKind: CanvasKind;
        startX: number;
        startY: number;
        origin: Rect;
        pointerId: number;
        moved: boolean;
      }
    | {
        kind: 'resize';
        id: string;
        itemKind: CanvasKind;
        handle: ResizeHandle;
        startX: number;
        startY: number;
        origin: Rect;
        pointerId: number;
        moved: boolean;
      };

  let interaction = $state<Interaction | null>(null);
  const DRAG_THRESHOLD = 4;

  const query = $derived(searchQuery.trim().toLowerCase());
  const hasQuery = $derived(query.length > 0);
  const isEmpty = $derived(dials.length === 0 && widgets.length === 0);

  function matchesQuery(dial: Dial): boolean {
    if (!hasQuery) return true;
    return (
      dial.title.toLowerCase().includes(query) ||
      dial.url.toLowerCase().includes(query)
    );
  }

  function measureCanvas() {
    if (!canvasEl) return;
    const next = {
      width: Math.max(settings.canvasMinWidth, canvasEl.clientWidth),
      height: Math.max(settings.canvasMinHeight, canvasEl.clientHeight),
    };
    canvasSize = next;
    onCanvasSizeChange?.(next);
  }

  $effect(() => {
    void settings.canvasMinWidth;
    void settings.canvasMinHeight;
    measureCanvas();
    const observer = new ResizeObserver(() => measureCanvas());
    if (canvasEl) observer.observe(canvasEl);
    return () => observer.disconnect();
  });

  function itemRect(item: { x: number; y: number; width: number; height: number }): Rect {
    return {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    };
  }

  function displayRect(item: { id: string; x: number; y: number; width: number; height: number }): Rect {
    return previewById[item.id] ?? itemRect(item);
  }

  function liveCandidate(raw: Rect): Rect {
    let next = clampRect(raw, canvasSize);
    if (settings.snapEnabled) {
      next = snapRect(next, settings.gridSize, settings.snapThreshold);
    }
    return next;
  }

  function applyResize(
    origin: Rect,
    handle: ResizeHandle,
    dx: number,
    dy: number,
  ): Rect {
    let { x, y, width, height } = origin;
    const min = Math.max(64, settings.gridSize);

    if (handle.includes('e')) width = Math.max(min, origin.width + dx);
    if (handle.includes('s')) height = Math.max(min, origin.height + dy);
    if (handle.includes('w')) {
      width = Math.max(min, origin.width - dx);
      x = origin.x + (origin.width - width);
    }
    if (handle.includes('n')) {
      height = Math.max(min, origin.height - dy);
      y = origin.y + (origin.height - height);
    }

    return { x, y, width, height };
  }

  function detachWindowListeners() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  }

  function attachWindowListeners() {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function beginInteraction(next: Interaction) {
    interaction = next;
    attachWindowListeners();
  }

  function onDialMoveStart(dial: Dial, event: PointerEvent) {
    if (!editMode) return;
    event.preventDefault();
    selectedId = dial.id;
    beginInteraction({
      kind: 'move',
      id: dial.id,
      itemKind: 'dial',
      startX: event.clientX,
      startY: event.clientY,
      origin: itemRect(dial),
      pointerId: event.pointerId,
      moved: false,
    });
  }

  function onDialResizeStart(
    dial: Dial,
    handle: ResizeHandle,
    event: PointerEvent,
  ) {
    if (!editMode) return;
    event.preventDefault();
    selectedId = dial.id;
    beginInteraction({
      kind: 'resize',
      id: dial.id,
      itemKind: 'dial',
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: itemRect(dial),
      pointerId: event.pointerId,
      moved: false,
    });
  }

  function onWidgetMoveStart(widget: Widget, event: PointerEvent) {
    if (!editMode) return;
    event.preventDefault();
    selectedId = widget.id;
    beginInteraction({
      kind: 'move',
      id: widget.id,
      itemKind: 'widget',
      startX: event.clientX,
      startY: event.clientY,
      origin: itemRect(widget),
      pointerId: event.pointerId,
      moved: false,
    });
  }

  function onWidgetResizeStart(
    widget: Widget,
    handle: ResizeHandle,
    event: PointerEvent,
  ) {
    if (!editMode) return;
    event.preventDefault();
    selectedId = widget.id;
    beginInteraction({
      kind: 'resize',
      id: widget.id,
      itemKind: 'widget',
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: itemRect(widget),
      pointerId: event.pointerId,
      moved: false,
    });
  }

  function allOtherRects(excludeId: string): Rect[] {
    return [
      ...dials.filter((d) => d.id !== excludeId).map(itemRect),
      ...widgets.filter((w) => w.id !== excludeId).map(itemRect),
    ];
  }

  function onPointerMove(event: PointerEvent) {
    const active = interaction;
    if (!active || event.pointerId !== active.pointerId) return;

    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    interaction = { ...active, moved: true };

    let proposed: Rect;
    if (active.kind === 'move') {
      proposed = {
        ...active.origin,
        x: active.origin.x + dx,
        y: active.origin.y + dy,
      };
    } else {
      proposed = applyResize(active.origin, active.handle, dx, dy);
    }

    const candidate = liveCandidate(proposed);
    previewById = { ...previewById, [active.id]: candidate };

    if (active.itemKind === 'dial') {
      onDialsChange(
        dials.map((d) => (d.id === active.id ? { ...d, ...candidate } : d)),
        { immediate: false },
      );
    } else {
      onWidgetsChange?.(
        widgets.map((w) => (w.id === active.id ? { ...w, ...candidate } : w)),
        { immediate: false },
      );
    }
  }

  function onPointerUp(event: PointerEvent) {
    const active = interaction;
    if (!active || event.pointerId !== active.pointerId) return;

    const proposed = previewById[active.id] ?? active.origin;
    const others = allOtherRects(active.id);

    const committed = resolveDrop(
      proposed,
      active.origin,
      others,
      {
        gridSize: settings.gridSize,
        snapEnabled: settings.snapEnabled,
        snapThreshold: settings.snapThreshold,
      },
      canvasSize,
    );

    const { [active.id]: _, ...rest } = previewById;
    previewById = rest;
    interaction = null;
    detachWindowListeners();

    if (active.itemKind === 'dial') {
      onDialsChange(
        dials.map((d) => (d.id === active.id ? { ...d, ...committed } : d)),
        { immediate: true },
      );
    } else {
      onWidgetsChange?.(
        widgets.map((w) => (w.id === active.id ? { ...w, ...committed } : w)),
        { immediate: true },
      );
    }
  }

  $effect(() => {
    return () => detachWindowListeners();
  });

  function handleCanvasContextMenu(event: MouseEvent) {
    if (!onCanvasContextMenu || !canvasEl) return;
    const el = event.target as HTMLElement | null;
    if (!el || !canvasEl.contains(el)) return;
    // Leave dial/widget menus alone (they stopPropagation); skip empty-state buttons.
    if (el.closest('button, a, input, textarea, select')) return;

    event.preventDefault();
    const bounds = canvasEl.getBoundingClientRect();
    onCanvasContextMenu(event, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }
</script>

<div
  bind:this={canvasEl}
  class="relative h-full w-full overflow-hidden"
  style:min-width="{settings.canvasMinWidth}px"
  style:min-height="{settings.canvasMinHeight}px"
  style:cursor={interaction?.kind === 'move' ? 'grabbing' : undefined}
  role="presentation"
  oncontextmenu={handleCanvasContextMenu}
>
  <GridOverlay
    gridSize={settings.gridSize}
    visible={editMode && settings.snapEnabled}
  />

  {#if isEmpty}
    <div
      class="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <p class="text-base text-[var(--dial-title)]">{t('emptyCanvas')}</p>
      <p class="text-sm text-[var(--text-muted)]">{t('emptyCanvasHint')}</p>
      {#if editMode}
        <div class="pointer-events-auto mt-2 flex flex-wrap items-center justify-center gap-2">
          {#if onAddDial}
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              style:background="var(--accent)"
              style:color="#0f1216"
              onclick={onAddDial}
            >
              + {t('addDial')}
            </button>
          {/if}
          {#if onAddWidget}
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              style:background="var(--toolbar-bg)"
              style:border="1px solid var(--dial-border)"
              style:color="var(--dial-title)"
              onclick={onAddWidget}
            >
              + {t('addWidget')}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {:else if hasQuery && !dials.some(matchesQuery)}
    <div
      class="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]"
    >
      {t('searchNoResults')}
    </div>
  {/if}

  {#each dials as dial (dial.id)}
    {@const rect = displayRect(dial)}
    <DialCell
      dial={{ ...dial, ...rect }}
      {editMode}
      selected={selectedId === dial.id}
      preview={Boolean(previewById[dial.id])}
      dragging={interaction?.kind === 'move' && interaction.id === dial.id}
      dimmed={hasQuery && !matchesQuery(dial)}
      iconSize={dial.iconSize ?? settings.iconSize}
      fontSize={dial.fontSize ?? settings.fontSize}
      onEdit={onEditDial}
      onMoveStart={onDialMoveStart}
      onResizeStart={onDialResizeStart}
      {onContextMenu}
    />
  {/each}

  {#each widgets as widget (widget.id)}
    {@const rect = displayRect(widget)}
    <WidgetCell
      widget={{ ...widget, ...rect }}
      {editMode}
      selected={selectedId === widget.id}
      preview={Boolean(previewById[widget.id])}
      dragging={interaction?.kind === 'move' && interaction.id === widget.id}
      dimmed={hasQuery}
      {background}
      onEdit={(w) => onEditWidget?.(w)}
      onPatch={onPatchWidget}
      onMoveStart={onWidgetMoveStart}
      onResizeStart={onWidgetResizeStart}
      onContextMenu={(w, e) => onWidgetContextMenu?.(w, e)}
    />
  {/each}
</div>
