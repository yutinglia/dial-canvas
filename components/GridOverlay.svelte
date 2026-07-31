<script lang="ts">
  import type { Size } from '../lib/layout';

  interface Props {
    gridSize: number;
    visible: boolean;
    canvasSize: Size;
    /** Boost contrast while dragging / resizing. */
    emphasized?: boolean;
  }

  let { gridSize, visible, canvasSize, emphasized = false }: Props = $props();

  const majorSize = $derived(Math.max(gridSize * 4, gridSize));
  const minorColor = $derived(
    emphasized ? 'var(--grid-line-emphasized)' : 'var(--grid-line)',
  );
  const majorColor = $derived(
    emphasized ? 'var(--grid-line-major-emphasized)' : 'var(--grid-line-major)',
  );

  /** Offset so a grid line passes through canvas mid. */
  const minorPosX = $derived(((canvasSize.width / 2) % gridSize + gridSize) % gridSize);
  const minorPosY = $derived(((canvasSize.height / 2) % gridSize + gridSize) % gridSize);
  const majorPosX = $derived(((canvasSize.width / 2) % majorSize + majorSize) % majorSize);
  const majorPosY = $derived(((canvasSize.height / 2) % majorSize + majorSize) % majorSize);
</script>

{#if visible}
  <div
    class="pointer-events-none absolute inset-0 z-0"
    style:background-image="linear-gradient(to right, {minorColor} 1px, transparent 1px), linear-gradient(to bottom, {minorColor} 1px, transparent 1px), linear-gradient(to right, {majorColor} 1px, transparent 1px), linear-gradient(to bottom, {majorColor} 1px, transparent 1px)"
    style:background-size="{gridSize}px {gridSize}px, {gridSize}px {gridSize}px, {majorSize}px {majorSize}px, {majorSize}px {majorSize}px"
    style:background-position="{minorPosX}px {minorPosY}px, {minorPosX}px {minorPosY}px, {majorPosX}px {majorPosY}px, {majorPosX}px {majorPosY}px"
    aria-hidden="true"
  ></div>
{/if}
