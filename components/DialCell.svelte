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

  /** Armed while primary button is held on this cell; cleared on leave/cancel. */
  let pressArmed = $state(false);

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
</script>

<div
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
      if (e.button === 0) pressArmed = true;
      return;
    }
    if ((e.target as HTMLElement).closest('[data-handle]')) return;
    onMoveStart(dial, e);
  }}
  onpointerleave={() => {
    pressArmed = false;
  }}
  onpointercancel={() => {
    pressArmed = false;
  }}
  onclick={(e) => {
    if (editMode) {
      e.preventDefault();
      return;
    }
    if (!pressArmed) {
      e.preventDefault();
      return;
    }
    pressArmed = false;
    onNavigate(dial);
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
        class="max-h-[40%] min-h-0 shrink rounded-sm object-contain"
        style:width="{iconSize}px"
        style:height="{iconSize}px"
        loading="lazy"
        onerror={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
    {/if}
    <span
      class="shrink-0 line-clamp-2 leading-snug text-[var(--dial-title)]"
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
