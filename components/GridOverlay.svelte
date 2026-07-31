<script lang="ts">
  interface Props {
    gridSize: number;
    visible: boolean;
  }

  let { gridSize, visible }: Props = $props();
</script>

{#if visible}
  <div
    class="pointer-events-none absolute inset-0 z-0"
    style:background-image="linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)"
    style:background-size="{gridSize}px {gridSize}px"
    aria-hidden="true"
  ></div>
{/if}
