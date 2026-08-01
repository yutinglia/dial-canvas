<script lang="ts">
  import DialCell from './DialCell.svelte';
  import WidgetCell from './WidgetCell.svelte';
  import GridOverlay from './GridOverlay.svelte';
  import AlignGuides from './AlignGuides.svelte';
  import type { Dial } from '../lib/schemas/dial';
  import type { Widget } from '../lib/schemas/widget';
  import type { Background, Settings } from '../lib/schemas/settings';
  import {
    activeAlignGuides,
    alignSnapRect,
    canvasOrigin,
    clampRect,
    fitCanvasInViewport,
    intersects,
    layoutNarrowStack,
    resolveDrop,
    resolveGroupDrop,
    snapRect,
    type AlignGuides as AlignGuideLines,
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
    /** Locked freeform layout size from the store (set after first wide measure). */
    layoutSize?: Size;
    onDialsChange: (dials: Dial[], opts?: { immediate?: boolean }) => void;
    onWidgetsChange?: (widgets: Widget[], opts?: { immediate?: boolean }) => void;
    onPatchWidget?: (widget: Widget) => void;
    onEditDial: (dial: Dial) => void;
    onEditWidget?: (widget: Widget) => void;
    /** Persist the locked layout size once (no dial/widget rewrites). */
    onLayoutSizeLock?: (size: Size) => void;
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
    layoutSize,
    onDialsChange,
    onWidgetsChange,
    onPatchWidget,
    onEditDial,
    onEditWidget,
    onLayoutSizeLock,
    onContextMenu,
    onWidgetContextMenu,
    onCanvasContextMenu,
    onAddDial,
    onAddWidget,
  }: Props = $props();

  const background = $derived(settings.background as Background);

  let viewportEl: HTMLDivElement | undefined = $state();
  let canvasEl: HTMLDivElement | undefined = $state();
  let viewportSize = $state<Size>({ width: 1200, height: 800 });
  let selectedIds = $state<string[]>([]);
  let previewById = $state<Record<string, Rect>>({});
  /** Avoid spamming onLayoutSizeLock before the store prop catches up. */
  let layoutLockRequested = false;

  type Interaction =
    | {
        kind: 'move';
        id: string;
        itemKind: CanvasKind;
        startX: number;
        startY: number;
        origin: Rect;
        origins: Record<string, Rect>;
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
      }
    | {
        kind: 'marquee';
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        pointerId: number;
        moved: boolean;
      };

  let interaction = $state<Interaction | null>(null);
  const DRAG_THRESHOLD = 4;

  const query = $derived(searchQuery.trim().toLowerCase());
  const hasQuery = $derived(query.length > 0);
  const isNarrow = $derived(
    !editMode && viewportSize.width < settings.narrowBreakpoint,
  );
  const isEmpty = $derived(dials.length === 0 && widgets.length === 0);

  const narrowOverrides = $derived.by((): Record<string, Rect> => {
    if (!isNarrow) return {};
    const stacked = layoutNarrowStack(
      [
        ...dials.map((d) => ({
          id: d.id,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          showWhenNarrow: d.showWhenNarrow,
          narrowOrder: d.narrowOrder,
        })),
        ...widgets.map((w) => ({
          id: w.id,
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
          showWhenNarrow: w.showWhenNarrow,
          narrowOrder: w.narrowOrder,
        })),
      ],
      viewportSize,
    );
    const map: Record<string, Rect> = {};
    for (const entry of stacked) map[entry.id] = entry.rect;
    return map;
  });

  const visibleDials = $derived(
    isNarrow ? dials.filter((d) => d.showWhenNarrow) : dials,
  );
  const visibleWidgets = $derived(
    isNarrow ? widgets.filter((w) => w.showWhenNarrow) : widgets,
  );

  const marqueeRect = $derived.by((): Rect | null => {
    const active = interaction;
    if (!active || active.kind !== 'marquee' || !active.moved) return null;
    return {
      x: Math.min(active.startX, active.currentX),
      y: Math.min(active.startY, active.currentY),
      width: Math.abs(active.currentX - active.startX),
      height: Math.abs(active.currentY - active.startY),
    };
  });

  const movingIds = $derived.by((): Set<string> => {
    const active = interaction;
    if (!active || active.kind !== 'move') return new Set();
    return new Set(Object.keys(active.origins));
  });

  function matchesQuery(dial: Dial): boolean {
    if (!hasQuery) return true;
    return (
      dial.title.toLowerCase().includes(query) ||
      dial.url.toLowerCase().includes(query)
    );
  }

  function measureViewport() {
    if (!viewportEl) return;
    const next = {
      width: viewportEl.clientWidth || window.innerWidth,
      height: viewportEl.clientHeight || window.innerHeight,
    };
    if (
      next.width === viewportSize.width &&
      next.height === viewportSize.height
    ) {
      return;
    }
    viewportSize = next;
  }

  /** Propose and lock layout size once on first wide measure. */
  function maybeLockLayoutSize() {
    if (layoutSize || layoutLockRequested) return;
    // Skip while narrow so a temporary shrink does not lock a tiny layout.
    if (!editMode && viewportSize.width < settings.narrowBreakpoint) return;
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    layoutLockRequested = true;
    onLayoutSizeLock?.({
      width: Math.max(settings.canvasMinWidth, viewportSize.width),
      height: Math.max(settings.canvasMinHeight, viewportSize.height),
    });
  }

  function measureAll() {
    measureViewport();
    maybeLockLayoutSize();
  }

  /** Fixed layout coordinate space (locked size, or provisional until lock). */
  const canvasSize = $derived(
    layoutSize ?? {
      width: Math.max(settings.canvasMinWidth, viewportSize.width),
      height: Math.max(settings.canvasMinHeight, viewportSize.height),
    },
  );

  /** Uniform scale + center so the whole canvas follows the viewport. */
  const fit = $derived(
    isNarrow
      ? { scale: 1, offsetX: 0, offsetY: 0 }
      : fitCanvasInViewport(canvasSize, viewportSize),
  );

  $effect(() => {
    void settings.canvasMinWidth;
    void settings.canvasMinHeight;
    void settings.narrowBreakpoint;
    void editMode;
    void layoutSize;
    measureAll();
    const observer = new ResizeObserver(() => measureAll());
    if (viewportEl) observer.observe(viewportEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (editMode) return;
    selectedIds = [];
    previewById = {};
    if (interaction) {
      interaction = null;
      detachWindowListeners();
    }
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
    return narrowOverrides[item.id] ?? previewById[item.id] ?? itemRect(item);
  }

  function liveCandidate(raw: Rect, others: Rect[]): Rect {
    let next = clampRect(raw, canvasSize);
    if (settings.snapEnabled) {
      next = snapRect(
        next,
        settings.gridSize,
        settings.snapThreshold,
        canvasOrigin(canvasSize),
      );
      next = alignSnapRect(
        next,
        { canvas: canvasSize, others },
        settings.snapThreshold,
      );
      next = clampRect(next, canvasSize);
    }
    return next;
  }

  const snapGuidesVisible = $derived(editMode && settings.snapEnabled);
  const interactionActive = $derived(Boolean(interaction?.moved));
  const activeGuideLines = $derived.by((): AlignGuideLines | null => {
    const active = interaction;
    if (!active?.moved || active.kind === 'marquee' || !settings.snapEnabled) {
      return null;
    }
    const preview = previewById[active.id];
    if (!preview) return null;
    const exclude =
      active.kind === 'move' ? Object.keys(active.origins) : [active.id];
    return activeAlignGuides(
      preview,
      { canvas: canvasSize, others: allOtherRects(exclude) },
      settings.snapThreshold,
    );
  });

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

  function clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    if (!canvasEl) return { x: 0, y: 0 };
    const bounds = canvasEl.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return { x: 0, y: 0 };
    // Map through CSS scale via bounding rect → layout coordinates.
    return {
      x: ((clientX - bounds.left) * canvasSize.width) / bounds.width,
      y: ((clientY - bounds.top) * canvasSize.height) / bounds.height,
    };
  }

  function lookupItemRect(id: string): Rect | null {
    const dial = dials.find((d) => d.id === id);
    if (dial) return itemRect(dial);
    const widget = widgets.find((w) => w.id === id);
    if (widget) return itemRect(widget);
    return null;
  }

  function buildMoveOrigins(primaryId: string, primaryRect: Rect): Record<string, Rect> {
    const ids = selectedIds.includes(primaryId) ? selectedIds : [primaryId];
    const origins: Record<string, Rect> = {};
    for (const id of ids) {
      const rect = id === primaryId ? primaryRect : lookupItemRect(id);
      if (rect) origins[id] = rect;
    }
    origins[primaryId] = primaryRect;
    return origins;
  }

  function applyRectsToStore(
    rects: Record<string, Rect>,
    opts: { immediate: boolean },
  ) {
    let dialsTouched = false;
    let widgetsTouched = false;
    const nextDials = dials.map((d) => {
      const rect = rects[d.id];
      if (!rect) return d;
      dialsTouched = true;
      return { ...d, ...rect };
    });
    const nextWidgets = widgets.map((w) => {
      const rect = rects[w.id];
      if (!rect) return w;
      widgetsTouched = true;
      return { ...w, ...rect };
    });
    if (dialsTouched) onDialsChange(nextDials, opts);
    if (widgetsTouched) onWidgetsChange?.(nextWidgets, opts);
  }

  function onDialMoveStart(dial: Dial, event: PointerEvent) {
    if (!editMode) return;
    event.preventDefault();
    const origin = itemRect(dial);
    if (!selectedIds.includes(dial.id)) {
      selectedIds = [dial.id];
    }
    const origins = buildMoveOrigins(dial.id, origin);
    beginInteraction({
      kind: 'move',
      id: dial.id,
      itemKind: 'dial',
      startX: event.clientX,
      startY: event.clientY,
      origin,
      origins,
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
    selectedIds = [dial.id];
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
    const origin = itemRect(widget);
    if (!selectedIds.includes(widget.id)) {
      selectedIds = [widget.id];
    }
    const origins = buildMoveOrigins(widget.id, origin);
    beginInteraction({
      kind: 'move',
      id: widget.id,
      itemKind: 'widget',
      startX: event.clientX,
      startY: event.clientY,
      origin,
      origins,
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
    selectedIds = [widget.id];
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

  function allOtherRects(excludeIds: string | string[]): Rect[] {
    const exclude = new Set(
      Array.isArray(excludeIds) ? excludeIds : [excludeIds],
    );
    return [
      ...dials.filter((d) => !exclude.has(d.id)).map(itemRect),
      ...widgets.filter((w) => !exclude.has(w.id)).map(itemRect),
    ];
  }

  function isEmptyCanvasTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement) || !canvasEl) return false;
    if (!canvasEl.contains(el)) return false;
    if (el.closest('[data-canvas-item], button, a, input, textarea, select')) {
      return false;
    }
    return true;
  }

  function onCanvasPointerDown(event: PointerEvent) {
    if (!editMode || event.button !== 0) return;
    if (!isEmptyCanvasTarget(event.target)) return;
    event.preventDefault();
    const point = clientToCanvas(event.clientX, event.clientY);
    beginInteraction({
      kind: 'marquee',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      pointerId: event.pointerId,
      moved: false,
    });
  }

  function selectIntersecting(marquee: Rect) {
    const next: string[] = [];
    for (const dial of dials) {
      if (intersects(marquee, itemRect(dial))) next.push(dial.id);
    }
    for (const widget of widgets) {
      if (intersects(marquee, itemRect(widget))) next.push(widget.id);
    }
    selectedIds = next;
  }

  function onPointerMove(event: PointerEvent) {
    const active = interaction;
    if (!active || event.pointerId !== active.pointerId) return;

    if (active.kind === 'marquee') {
      const dx = event.clientX - active.startClientX;
      const dy = event.clientY - active.startClientY;
      if (!active.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      const point = clientToCanvas(event.clientX, event.clientY);
      interaction = {
        ...active,
        moved: true,
        currentX: point.x,
        currentY: point.y,
      };
      return;
    }

    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    interaction = { ...active, moved: true };

    if (active.kind === 'move') {
      const exclude = Object.keys(active.origins);
      const proposedPrimary = {
        ...active.origin,
        x: active.origin.x + dx,
        y: active.origin.y + dy,
      };
      const candidatePrimary = liveCandidate(
        proposedPrimary,
        allOtherRects(exclude),
      );
      const deltaX = candidatePrimary.x - active.origin.x;
      const deltaY = candidatePrimary.y - active.origin.y;
      const nextPreview: Record<string, Rect> = {};
      for (const [id, origin] of Object.entries(active.origins)) {
        nextPreview[id] = {
          ...origin,
          x: origin.x + deltaX,
          y: origin.y + deltaY,
        };
      }
      previewById = { ...previewById, ...nextPreview };
      applyRectsToStore(nextPreview, { immediate: false });
      return;
    }

    const proposed = applyResize(active.origin, active.handle, dx, dy);
    const candidate = liveCandidate(proposed, allOtherRects(active.id));
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

  function clearPreviewIds(ids: string[]) {
    const next = { ...previewById };
    for (const id of ids) delete next[id];
    previewById = next;
  }

  function onPointerUp(event: PointerEvent) {
    const active = interaction;
    if (!active || event.pointerId !== active.pointerId) return;

    if (active.kind === 'marquee') {
      interaction = null;
      detachWindowListeners();
      if (!active.moved) {
        selectedIds = [];
        return;
      }
      selectIntersecting({
        x: Math.min(active.startX, active.currentX),
        y: Math.min(active.startY, active.currentY),
        width: Math.abs(active.currentX - active.startX),
        height: Math.abs(active.currentY - active.startY),
      });
      return;
    }

    if (active.kind === 'move') {
      const exclude = Object.keys(active.origins);
      const proposed = previewById[active.id] ?? {
        ...active.origin,
        x: active.origin.x,
        y: active.origin.y,
      };
      const committed = resolveGroupDrop(
        active.id,
        proposed,
        active.origins,
        allOtherRects(exclude),
        {
          gridSize: settings.gridSize,
          snapEnabled: settings.snapEnabled,
          snapThreshold: settings.snapThreshold,
        },
        canvasSize,
      );
      clearPreviewIds(exclude);
      interaction = null;
      detachWindowListeners();
      applyRectsToStore(committed, { immediate: true });
      return;
    }

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

    clearPreviewIds([active.id]);
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
    onCanvasContextMenu(event, clientToCanvas(event.clientX, event.clientY));
  }
</script>

<div bind:this={viewportEl} class="relative h-full w-full overflow-hidden">
  <div
    bind:this={canvasEl}
    class="absolute overflow-hidden"
    class:inset-0={isNarrow}
    style:width={isNarrow ? undefined : `${canvasSize.width}px`}
    style:height={isNarrow ? undefined : `${canvasSize.height}px`}
    style:transform={isNarrow
      ? undefined
      : `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`}
    style:transform-origin={isNarrow ? undefined : '0 0'}
    style:cursor={interaction?.kind === 'move'
      ? 'grabbing'
      : interaction?.kind === 'marquee'
        ? 'crosshair'
        : undefined}
    role="presentation"
    onpointerdown={onCanvasPointerDown}
    oncontextmenu={handleCanvasContextMenu}
  >
    <GridOverlay
      gridSize={settings.gridSize}
      visible={snapGuidesVisible && !isNarrow}
      {canvasSize}
      emphasized={interactionActive}
    />
    <AlignGuides
      visible={snapGuidesVisible && !isNarrow}
      {canvasSize}
      activeGuides={activeGuideLines}
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
    {:else if hasQuery && !visibleDials.some(matchesQuery)}
      <div
        class="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]"
      >
        {t('searchNoResults')}
      </div>
    {/if}

    {#each visibleDials as dial (dial.id)}
      {@const rect = displayRect(dial)}
      <DialCell
        dial={{ ...dial, ...rect }}
        {editMode}
        selected={selectedIds.includes(dial.id)}
        preview={Boolean(previewById[dial.id])}
        dragging={movingIds.has(dial.id)}
        dimmed={hasQuery && !matchesQuery(dial)}
        iconSize={dial.iconSize ?? settings.iconSize}
        fontSize={dial.fontSize ?? settings.fontSize}
        onEdit={onEditDial}
        onMoveStart={onDialMoveStart}
        onResizeStart={onDialResizeStart}
        {onContextMenu}
      />
    {/each}

    {#each visibleWidgets as widget (widget.id)}
      {@const rect = displayRect(widget)}
      <WidgetCell
        widget={{ ...widget, ...rect }}
        {editMode}
        selected={selectedIds.includes(widget.id)}
        preview={Boolean(previewById[widget.id])}
        dragging={movingIds.has(widget.id)}
        dimmed={hasQuery}
        {background}
        onEdit={(w) => onEditWidget?.(w)}
        onPatch={onPatchWidget}
        onMoveStart={onWidgetMoveStart}
        onResizeStart={onWidgetResizeStart}
        onContextMenu={(w, e) => onWidgetContextMenu?.(w, e)}
      />
    {/each}

    {#if marqueeRect}
      <div
        class="pointer-events-none absolute z-20 border border-[var(--accent)] bg-[rgba(107,143,113,0.18)]"
        style:left="{marqueeRect.x}px"
        style:top="{marqueeRect.y}px"
        style:width="{marqueeRect.width}px"
        style:height="{marqueeRect.height}px"
        aria-hidden="true"
      ></div>
    {/if}
  </div>
</div>
