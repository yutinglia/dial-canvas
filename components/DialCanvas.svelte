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
  } from '../lib/layout';

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
    onDialsChange: (dials: Dial[], opts?: { immediate?: boolean }) => void;
    onEditDial: (dial: Dial) => void;
  }

  let {
    dials,
    settings,
    editMode,
    onDialsChange,
    onEditDial,
  }: Props = $props();

  let canvasEl: HTMLDivElement | undefined = $state();
  let canvasSize = $state({ width: 1200, height: 800 });
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

  function measureCanvas() {
    if (!canvasEl) return;
    canvasSize = {
      width: Math.max(settings.canvasMinWidth, canvasEl.clientWidth),
      height: Math.max(settings.canvasMinHeight, canvasEl.clientHeight),
    };
  }

  $effect(() => {
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
      next = snapRect(next, settings.gridSize);
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

    // Debounced persist of live candidate during drag
    onDialsChange(
      dials.map((d) => (d.id === active.id ? { ...d, ...candidate } : d)),
      { immediate: false },
    );
  }

  function onPointerUp(event: PointerEvent) {
    const active = interaction;
    if (!active || event.pointerId !== active.pointerId) return;

    const proposed = previewById[active.id] ?? active.origin;
    // Exclude active dial using origin positions of others
    const others = dials
      .filter((d) => d.id !== active.id)
      .map(dialRect);

    const committed = resolveDrop(
      proposed,
      active.origin,
      others,
      {
        gridSize: settings.gridSize,
        snapEnabled: settings.snapEnabled,
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

  function onNavigate(dial: Dial) {
    window.location.href = dial.url;
  }

  export function getCanvasSize() {
    return { ...canvasSize };
  }

  $effect(() => {
    return () => detachWindowListeners();
  });
</script>

<div
  bind:this={canvasEl}
  class="relative h-full w-full overflow-hidden"
  style:background="var(--canvas-bg)"
  style:min-width="{settings.canvasMinWidth}px"
  style:min-height="{settings.canvasMinHeight}px"
  role="presentation"
>
  <GridOverlay gridSize={settings.gridSize} visible={editMode} />

  {#each dials as dial (dial.id)}
    {@const rect = displayRect(dial)}
    <DialCell
      dial={{ ...dial, ...rect }}
      {editMode}
      selected={selectedId === dial.id}
      preview={Boolean(previewById[dial.id])}
      {onNavigate}
      onEdit={onEditDial}
      {onMoveStart}
      {onResizeStart}
    />
  {/each}
</div>
