<script lang="ts">
  import DialCell from './DialCell.svelte';
  import GridOverlay from './GridOverlay.svelte';
  import type { Dial } from '../lib/schemas/dial';
  import type { Settings } from '../lib/schemas/settings';
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

  interface Props {
    dials: Dial[];
    settings: Settings;
    editMode: boolean;
    searchQuery?: string;
    onDialsChange: (dials: Dial[], opts?: { immediate?: boolean }) => void;
    onEditDial: (dial: Dial) => void;
    onCanvasSizeChange?: (size: Size) => void;
    onContextMenu: (dial: Dial, event: MouseEvent) => void;
    onAddDial?: () => void;
  }

  let {
    dials,
    settings,
    editMode,
    searchQuery = '',
    onDialsChange,
    onEditDial,
    onCanvasSizeChange,
    onContextMenu,
    onAddDial,
  }: Props = $props();

  let canvasEl: HTMLDivElement | undefined = $state();
  let canvasSize = $state<Size>({ width: 1200, height: 800 });
  let selectedId = $state<string | null>(null);
  let previewById = $state<Record<string, Rect>>({});

  type Interaction =
    | {
        kind: 'move';
        id: string;
        startX: number;
        startY: number;
        origin: Rect;
        pointerId: number;
        moved: boolean;
      }
    | {
        kind: 'resize';
        id: string;
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
    // Re-measure when min canvas settings change.
    void settings.canvasMinWidth;
    void settings.canvasMinHeight;
    measureCanvas();
    const observer = new ResizeObserver(() => measureCanvas());
    if (canvasEl) observer.observe(canvasEl);
    return () => observer.disconnect();
  });

  function dialRect(dial: Dial): Rect {
    return {
      x: dial.x,
      y: dial.y,
      width: dial.width,
      height: dial.height,
    };
  }

  function displayRect(dial: Dial): Rect {
    return previewById[dial.id] ?? dialRect(dial);
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

  function onMoveStart(dial: Dial, event: PointerEvent) {
    if (!editMode) return;
    event.preventDefault();
    selectedId = dial.id;
    beginInteraction({
      kind: 'move',
      id: dial.id,
      startX: event.clientX,
      startY: event.clientY,
      origin: dialRect(dial),
      pointerId: event.pointerId,
      moved: false,
    });
  }

  function onResizeStart(
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
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: dialRect(dial),
      pointerId: event.pointerId,
      moved: false,
    });
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

    onDialsChange(
      dials.map((d) => (d.id === active.id ? { ...d, ...candidate } : d)),
      { immediate: false },
    );
  }

  function onPointerUp(event: PointerEvent) {
    const active = interaction;
    if (!active || event.pointerId !== active.pointerId) return;

    const proposed = previewById[active.id] ?? active.origin;
    const others = dials.filter((d) => d.id !== active.id).map(dialRect);

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

    const nextDials = dials.map((d) =>
      d.id === active.id ? { ...d, ...committed } : d,
    );

    const { [active.id]: _, ...rest } = previewById;
    previewById = rest;
    interaction = null;
    detachWindowListeners();

    onDialsChange(nextDials, { immediate: true });
  }

  $effect(() => {
    return () => detachWindowListeners();
  });
</script>

<div
  bind:this={canvasEl}
  class="relative h-full w-full overflow-hidden"
  style:min-width="{settings.canvasMinWidth}px"
  style:min-height="{settings.canvasMinHeight}px"
  style:cursor={interaction?.kind === 'move' ? 'grabbing' : undefined}
  role="presentation"
>
  <GridOverlay
    gridSize={settings.gridSize}
    visible={editMode && settings.snapEnabled}
  />

  {#if dials.length === 0}
    <div
      class="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <p class="text-base text-[var(--dial-title)]">{t('emptyCanvas')}</p>
      <p class="text-sm text-[var(--text-muted)]">{t('emptyCanvasHint')}</p>
      {#if editMode && onAddDial}
        <button
          type="button"
          class="pointer-events-auto mt-2 rounded-md px-3 py-1.5 text-sm"
          style:background="var(--accent)"
          style:color="#0f1216"
          onclick={onAddDial}
        >
          + {t('addDial')}
        </button>
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
      {onMoveStart}
      {onResizeStart}
      {onContextMenu}
    />
  {/each}
</div>
