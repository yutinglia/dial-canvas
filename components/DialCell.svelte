<script lang="ts">
  import type { Dial } from '../lib/schemas/dial';
  import { resolveFaviconUrl } from '../lib/dials/favicon';

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
    dial: Dial;
    editMode: boolean;
    selected?: boolean;
    preview?: boolean;
    dragging?: boolean;
    iconSize?: number;
    fontSize?: number;
    onNavigate: (dial: Dial) => void;
    onEdit: (dial: Dial) => void;
    onMoveStart: (dial: Dial, event: PointerEvent) => void;
    onResizeStart: (
      dial: Dial,
      handle: ResizeHandle,
      event: PointerEvent,
    ) => void;
  }

  let {
    dial,
    editMode,
    selected = false,
    preview = false,
    dragging = false,
    iconSize = 40,
    fontSize = 15,
    onNavigate,
    onEdit,
    onMoveStart,
    onResizeStart,
  }: Props = $props();

  const hoverLift = $derived(!preview && !dragging);

  const favicon = $derived(resolveFaviconUrl(dial.url, dial.faviconUrl));

  const cursor = $derived(
    !editMode ? 'pointer' : dragging ? 'grabbing' : 'grab',
  );

  const CLICK_MOVE_THRESHOLD = 4;

  let cellEl: HTMLDivElement | undefined = $state();
  let pressArmed = false;
  let pressPointerId: number | null = null;
  let pressStartX = 0;
  let pressStartY = 0;

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

  function pointInCell(clientX: number, clientY: number): boolean {
    if (!cellEl) return false;
    const rect = cellEl.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function detachPressListeners() {
    window.removeEventListener('pointermove', onPressPointerMove);
    window.removeEventListener('pointerup', onPressPointerUp);
    window.removeEventListener('pointercancel', onPressPointerCancel);
  }

  function onPressPointerMove(event: PointerEvent) {
    if (event.pointerId !== pressPointerId || !pressArmed) return;
    const dx = event.clientX - pressStartX;
    const dy = event.clientY - pressStartY;
    if (
      Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD ||
      !pointInCell(event.clientX, event.clientY)
    ) {
      pressArmed = false;
    }
  }

  function endPressTracking(event: PointerEvent) {
    if (event.pointerId !== pressPointerId) return false;
    pressArmed = false;
    pressPointerId = null;
    detachPressListeners();
    return true;
  }

  function onPressPointerUp(event: PointerEvent) {
    const wasTracking = event.pointerId === pressPointerId;
    const shouldNavigate =
      wasTracking && pressArmed && pointInCell(event.clientX, event.clientY);
    if (!endPressTracking(event)) return;
    if (shouldNavigate) onNavigate(dial);
  }

  function onPressPointerCancel(event: PointerEvent) {
    // Abort only — never navigate (e.g. native image drag cancel).
    endPressTracking(event);
  }

  function beginBrowsePress(event: PointerEvent) {
    detachPressListeners();
    pressArmed = true;
    pressPointerId = event.pointerId;
    pressStartX = event.clientX;
    pressStartY = event.clientY;
    window.addEventListener('pointermove', onPressPointerMove);
    window.addEventListener('pointerup', onPressPointerUp);
    window.addEventListener('pointercancel', onPressPointerCancel);
  }

  $effect(() => {
    return () => detachPressListeners();
  });
</script>

<div
  bind:this={cellEl}
  class="group absolute z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--dial-border)] bg-[var(--dial-bg)] transition-[box-shadow,opacity,background,transform,border-color] hover:bg-[var(--dial-bg-hover)] hover:border-[rgba(255,255,255,0.18)]"
  class:ring-2={selected && editMode}
  class:hover:scale-[1.02]={hoverLift}
  style:left="{dial.x}px"
  style:top="{dial.y}px"
  style:width="{dial.width}px"
  style:height="{dial.height}px"
  style:background={preview ? 'rgba(107, 143, 113, 0.18)' : undefined}
  style:border-color={preview ? 'var(--accent)' : undefined}
  style:opacity={preview ? 0.85 : 1}
  style:box-shadow={selected && editMode
    ? '0 0 0 1px var(--accent)'
    : 'none'}
  style:cursor={cursor}
  role="link"
  tabindex="0"
  onpointerdown={(e) => {
    if (!editMode) {
      if (e.button === 0) beginBrowsePress(e);
      return;
    }
    if ((e.target as HTMLElement).closest('[data-handle]')) return;
    onMoveStart(dial, e);
  }}
  onclick={(e) => {
    // Browse navigation is handled on pointerup; block residual clicks.
    e.preventDefault();
  }}
  ondblclick={(e) => {
    if (!editMode) return;
    e.preventDefault();
    onEdit(dial);
  }}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (editMode) onEdit(dial);
      else onNavigate(dial);
    }
  }}
>
  <div
    class="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-2 text-center"
  >
    {#if favicon}
      <img
        src={favicon}
        alt=""
        draggable="false"
        class="max-h-[40%] min-h-0 shrink rounded-sm object-contain select-none"
        style="width: {iconSize}px; height: {iconSize}px; -webkit-user-drag: none"
        loading="lazy"
        onerror={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
    {/if}
    <span
      class="shrink-0 line-clamp-2 select-none leading-snug text-[var(--dial-title)]"
      style:font-size="{fontSize}px"
    >
      {dial.title}
    </span>
  </div>

  {#if editMode}
    <button
      type="button"
      class="absolute top-1.5 right-1.5 z-20 rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      style:cursor="pointer"
      title="Edit dial"
      onclick={(e) => {
        e.stopPropagation();
        onEdit(dial);
      }}
    >
      Edit
    </button>

    {#each handles as handle (handle)}
      <div
        class="absolute z-20 rounded-sm bg-[var(--accent)]"
        data-handle={handle}
        style={handleStyle(handle)}
        onpointerdown={(e) => {
          e.stopPropagation();
          onResizeStart(dial, handle, e);
        }}
        role="presentation"
      ></div>
    {/each}
  {/if}
</div>
