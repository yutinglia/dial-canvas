<script lang="ts">
  import type { AlignGuides, Size } from '../lib/layout';

  interface Props {
    visible: boolean;
    canvasSize: Size;
    /** Faint page-center crosshair when snap/edit is on. */
    showPageCenter?: boolean;
    /** Active brighter guides while dragging near a target. */
    activeGuides?: AlignGuides | null;
  }

  let {
    visible,
    canvasSize,
    showPageCenter = true,
    activeGuides = null,
  }: Props = $props();

  const pageMidX = $derived(canvasSize.width / 2);
  const pageMidY = $derived(canvasSize.height / 2);

  const activeVertical = $derived(activeGuides?.vertical ?? []);
  const activeHorizontal = $derived(activeGuides?.horizontal ?? []);

  function isPageMidX(x: number): boolean {
    return Math.abs(x - pageMidX) < 0.5;
  }

  function isPageMidY(y: number): boolean {
    return Math.abs(y - pageMidY) < 0.5;
  }
</script>

{#if visible}
  <div class="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
    {#if showPageCenter}
      <div
        class="absolute top-0 bottom-0 w-px"
        style:left="{pageMidX}px"
        style:background={activeVertical.some(isPageMidX)
          ? 'var(--align-guide-active)'
          : 'var(--align-guide)'}
      ></div>
      <div
        class="absolute left-0 right-0 h-px"
        style:top="{pageMidY}px"
        style:background={activeHorizontal.some(isPageMidY)
          ? 'var(--align-guide-active)'
          : 'var(--align-guide)'}
      ></div>
    {/if}

    {#each activeVertical.filter((x) => !isPageMidX(x)) as x (x)}
      <div
        class="absolute top-0 bottom-0 w-px"
        style:left="{x}px"
        style:background="var(--align-guide-active)"
      ></div>
    {/each}

    {#each activeHorizontal.filter((y) => !isPageMidY(y)) as y (y)}
      <div
        class="absolute left-0 right-0 h-px"
        style:top="{y}px"
        style:background="var(--align-guide-active)"
      ></div>
    {/each}
  </div>
{/if}
