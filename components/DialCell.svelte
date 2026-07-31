<script lang="ts">
  import {
    dialBackgroundCss,
    dialBackgroundHoverCss,
    isAllowedDialUrl,
    type Dial,
  } from '../lib/schemas/dial';
  import {
    dialMonogram,
    resolveFaviconChain,
  } from '../lib/dials/favicon';
  import { t } from '../lib/i18n';
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
    dial: Dial;
    editMode: boolean;
    selected?: boolean;
    preview?: boolean;
    dragging?: boolean;
    dimmed?: boolean;
    iconSize?: number;
    fontSize?: number;
    onEdit: (dial: Dial) => void;
    onMoveStart: (dial: Dial, event: PointerEvent) => void;
    onResizeStart: (
      dial: Dial,
      handle: ResizeHandle,
      event: PointerEvent,
    ) => void;
    onContextMenu: (dial: Dial, event: MouseEvent) => void;
  }

  let {
    dial,
    editMode,
    selected = false,
    preview = false,
    dragging = false,
    dimmed = false,
    iconSize = 40,
    fontSize = 15,
    onEdit,
    onMoveStart,
    onResizeStart,
    onContextMenu,
  }: Props = $props();

  const hoverLift = $derived(!preview && !dragging && !editMode);
  const faviconChain = $derived(resolveFaviconChain(dial.url, dial.faviconUrl));
  const monogram = $derived(dialMonogram(dial.title));
  const canLink = $derived(isAllowedDialUrl(dial.url));
  const customBackground = $derived(
    dialBackgroundCss(dial.backgroundColor, dial.backgroundOpacity),
  );
  const customBackgroundHover = $derived(
    dialBackgroundHoverCss(dial.backgroundColor, dial.backgroundOpacity),
  );

  let faviconIndex = $state(0);
  let showMonogram = $state(false);

  $effect(() => {
    // Reset icon chain when dial identity / favicon changes.
    void dial.id;
    void dial.faviconUrl;
    void dial.url;
    faviconIndex = 0;
    showMonogram = faviconChain.length === 0;
  });

  const currentFavicon = $derived(
    !showMonogram && faviconIndex < faviconChain.length
      ? faviconChain[faviconIndex]
      : '',
  );

  const cursor = $derived(
    !editMode ? 'pointer' : dragging ? 'grabbing' : 'grab',
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

  function onFaviconError() {
    const next = faviconIndex + 1;
    if (next < faviconChain.length) {
      faviconIndex = next;
    } else {
      showMonogram = true;
    }
  }

  const shellClass =
    'group absolute z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--dial-border)] bg-[var(--dial-bg)] transition-[box-shadow,opacity,background,transform,border-color] hover:bg-[var(--dial-bg-hover)] hover:border-[rgba(255,255,255,0.18)] no-underline text-inherit';
</script>

{#snippet dialBody()}
  <div
    class="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-2 text-center"
  >
    {#if currentFavicon}
      <img
        src={currentFavicon}
        alt=""
        draggable="false"
        class="max-h-[40%] min-h-0 shrink rounded-sm object-contain"
        style="width: {iconSize}px; height: {iconSize}px; -webkit-user-drag: none"
        loading="lazy"
        onerror={onFaviconError}
      />
    {:else}
      <div
        class="flex shrink-0 items-center justify-center rounded-md font-semibold tracking-wide"
        style:width="{iconSize}px"
        style:height="{iconSize}px"
        style:font-size="{Math.max(12, Math.round(iconSize * 0.42))}px"
        style:background="rgba(107, 143, 113, 0.22)"
        style:color="var(--accent)"
        aria-hidden="true"
      >
        {monogram}
      </div>
    {/if}
    <span
      class="shrink-0 line-clamp-2 leading-snug text-[var(--dial-title)]"
      style:font-size="{fontSize}px"
    >
      {dial.title}
    </span>
  </div>
{/snippet}

{#if editMode}
  <div
    class={shellClass}
    class:ring-2={selected}
    class:hover:scale-[1.02]={false}
    style:left="{dial.x}px"
    style:top="{dial.y}px"
    style:width="{dial.width}px"
    style:height="{dial.height}px"
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
      onMoveStart(dial, e);
    }}
    ondblclick={(e) => {
      e.preventDefault();
      onEdit(dial);
    }}
    oncontextmenu={(e) => onContextMenu(dial, e)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEdit(dial);
      }
    }}
  >
    {@render dialBody()}

    <ItemCenterCross />

    <button
      type="button"
      class="absolute top-1.5 right-1.5 z-20 rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      style:cursor="pointer"
      title={t('editDial')}
      onclick={(e) => {
        e.stopPropagation();
        onEdit(dial);
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
          onResizeStart(dial, handle, e);
        }}
        role="presentation"
      ></div>
    {/each}
  </div>
{:else if canLink}
  <a
    class={shellClass}
    class:hover:scale-[1.02]={hoverLift}
    style:left="{dial.x}px"
    style:top="{dial.y}px"
    style:width="{dial.width}px"
    style:height="{dial.height}px"
    style:--dial-bg={customBackground}
    style:--dial-bg-hover={customBackgroundHover}
    style:opacity={dimmed ? 0.28 : 1}
    style:cursor={cursor}
    href={dial.url}
    rel="noopener noreferrer"
    draggable="false"
    ondragstart={(e) => e.preventDefault()}
    oncontextmenu={(e) => onContextMenu(dial, e)}
  >
    {@render dialBody()}
  </a>
{:else}
  <div
    class={shellClass}
    style:left="{dial.x}px"
    style:top="{dial.y}px"
    style:width="{dial.width}px"
    style:height="{dial.height}px"
    style:--dial-bg={customBackground}
    style:--dial-bg-hover={customBackgroundHover}
    style:opacity={dimmed ? 0.28 : 1}
    style:cursor="not-allowed"
    role="presentation"
    oncontextmenu={(e) => onContextMenu(dial, e)}
  >
    {@render dialBody()}
  </div>
{/if}
