<script lang="ts">
  import type { Settings } from '../lib/schemas/settings';

  interface Props {
    open: boolean;
    settings: Settings;
    onClose: () => void;
    onChange: (partial: Partial<Settings>) => void;
  }

  let { open, settings, onClose, onChange }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style:background="var(--overlay)"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={onKeydown}
  >
    <div
      class="w-full max-w-md rounded-xl p-5 shadow-lg"
      style:background="#22262e"
      style:border="1px solid var(--dial-border)"
      role="dialog"
      aria-label="Settings"
    >
      <h2 class="mb-4 text-lg font-medium">Settings</h2>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>Grid size</span>
          <span>{settings.gridSize}px</span>
        </span>
        <input
          type="range"
          min="4"
          max="64"
          step="1"
          value={settings.gridSize}
          class="w-full"
          oninput={(e) => {
            const gridSize = Number((e.currentTarget as HTMLInputElement).value);
            onChange({
              gridSize,
              snapThreshold: Math.max(1, Math.floor(gridSize / 2)),
            });
          }}
        />
      </label>

      <label class="mb-4 flex items-center justify-between gap-3 text-sm">
        <span class="text-[var(--text-muted)]">Snap to grid (adsorption)</span>
        <input
          type="checkbox"
          checked={settings.snapEnabled}
          onchange={(e) =>
            onChange({
              snapEnabled: (e.currentTarget as HTMLInputElement).checked,
            })
          }
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>Icon size</span>
          <span>{settings.iconSize}px</span>
        </span>
        <input
          type="range"
          min="16"
          max="64"
          step="1"
          value={settings.iconSize}
          class="w-full"
          oninput={(e) => {
            onChange({
              iconSize: Number((e.currentTarget as HTMLInputElement).value),
            });
          }}
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>Font size</span>
          <span>{settings.fontSize}px</span>
        </span>
        <input
          type="range"
          min="10"
          max="24"
          step="1"
          value={settings.fontSize}
          class="w-full"
          oninput={(e) => {
            onChange({
              fontSize: Number((e.currentTarget as HTMLInputElement).value),
            });
          }}
        />
      </label>

      <label class="mb-5 block text-sm">
        <span class="mb-1 block text-[var(--text-muted)]">Background color</span>
        <div class="flex items-center gap-3">
          <input
            type="color"
            value={settings.background.value}
            oninput={(e) => {
              const value = (e.currentTarget as HTMLInputElement).value;
              onChange({ background: { type: 'color', value } });
            }}
          />
          <input
            class="flex-1 rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
            style:border-color="var(--dial-border)"
            value={settings.background.value}
            onchange={(e) => {
              const value = (e.currentTarget as HTMLInputElement).value.trim();
              if (value) onChange({ background: { type: 'color', value } });
            }}
          />
        </div>
      </label>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm"
          style:background="var(--accent)"
          style:color="#0f1216"
          onclick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
