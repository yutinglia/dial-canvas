<script lang="ts">
  import { onMount } from 'svelte';
  import DialCanvas from '../../components/DialCanvas.svelte';
  import EditToolbar from '../../components/EditToolbar.svelte';
  import DialEditorModal from '../../components/DialEditorModal.svelte';
  import SettingsPanel from '../../components/SettingsPanel.svelte';
  import { createId } from '../../lib/id';
  import { findFirstFreeSlot } from '../../lib/layout';
  import type { Dial } from '../../lib/schemas/dial';
  import type { Settings } from '../../lib/schemas/settings';
  import type { Store } from '../../lib/schemas/store';
  import {
    createDebouncedSaver,
    getStore,
    updateSettings,
  } from '../../lib/storage/repository';

  let store = $state<Store | null>(null);
  let editMode = $state(false);
  let settingsOpen = $state(false);
  let editorOpen = $state(false);
  let editingDial = $state<Dial | null>(null);
  let canvasSize = $state({ width: 1200, height: 800 });

  const saver = createDebouncedSaver(200);

  onMount(() => {
    void (async () => {
      store = await getStore();
      applyBackground(store.settings);
    })();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (editorOpen) {
          editorOpen = false;
          editingDial = null;
          return;
        }
        if (settingsOpen) {
          settingsOpen = false;
          return;
        }
        if (editMode) editMode = false;
      }
    };
    window.addEventListener('keydown', onKey);

    const onResize = () => {
      canvasSize = {
        width: Math.max(
          store?.settings.canvasMinWidth ?? 1200,
          window.innerWidth,
        ),
        height: Math.max(
          store?.settings.canvasMinHeight ?? 800,
          window.innerHeight,
        ),
      };
    };
    onResize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      void saver.flush();
    };
  });

  function applyBackground(settings: Settings) {
    document.documentElement.style.setProperty(
      '--canvas-bg',
      settings.background.value,
    );
  }

  async function persist(next: Store, immediate = true) {
    store = next;
    applyBackground(next.settings);
    if (immediate) {
      await saver.saveNow(next);
    } else {
      saver.schedule(next);
    }
  }

  function onDialsChange(dials: Dial[], opts?: { immediate?: boolean }) {
    if (!store) return;
    void persist({ ...store, dials }, opts?.immediate ?? true);
  }

  async function onSettingsChange(partial: Partial<Settings>) {
    if (!store) return;
    const next = await updateSettings(partial);
    store = next;
    applyBackground(next.settings);
  }

  function openAddDial() {
    editingDial = null;
    editorOpen = true;
  }

  function openEditDial(dial: Dial) {
    editingDial = dial;
    editorOpen = true;
  }

  function closeEditor() {
    editorOpen = false;
    editingDial = null;
  }

  async function saveDial(values: {
    title: string;
    url: string;
    faviconUrl?: string;
    iconSize?: number;
    fontSize?: number;
  }) {
    if (!store) return;

    if (editingDial) {
      const dials = store.dials.map((d) => {
        if (d.id !== editingDial!.id) return d;
        const next: Dial = {
          ...d,
          title: values.title,
          url: values.url,
          faviconUrl: values.faviconUrl,
        };
        if (values.iconSize !== undefined) next.iconSize = values.iconSize;
        else delete next.iconSize;
        if (values.fontSize !== undefined) next.fontSize = values.fontSize;
        else delete next.fontSize;
        return next;
      });
      await persist({ ...store, dials }, true);
    } else {
      const slot = findFirstFreeSlot(
        store.dials.map((d) => ({
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
        })),
        store.settings.gridSize,
        canvasSize,
      );
      const dial: Dial = {
        id: createId(),
        title: values.title,
        url: values.url,
        faviconUrl: values.faviconUrl,
        ...(values.iconSize !== undefined
          ? { iconSize: values.iconSize }
          : {}),
        ...(values.fontSize !== undefined
          ? { fontSize: values.fontSize }
          : {}),
        ...slot,
      };
      await persist({ ...store, dials: [...store.dials, dial] }, true);
    }
    closeEditor();
  }

  async function deleteDial() {
    if (!store || !editingDial) return;
    const dials = store.dials.filter((d) => d.id !== editingDial!.id);
    await persist({ ...store, dials }, true);
    closeEditor();
  }
</script>

{#if store}
  <div
    class="relative h-full w-full"
    style:background="var(--canvas-bg)"
  >
    <EditToolbar
      {editMode}
      onToggleEdit={() => (editMode = !editMode)}
      onAddDial={openAddDial}
      onOpenSettings={() => (settingsOpen = true)}
    />

    <main class="h-full w-full">
      <DialCanvas
        dials={store.dials}
        settings={store.settings}
        {editMode}
        {onDialsChange}
        onEditDial={openEditDial}
      />
    </main>

    <DialEditorModal
      open={editorOpen}
      dial={editingDial}
      globalIconSize={store.settings.iconSize}
      globalFontSize={store.settings.fontSize}
      onClose={closeEditor}
      onSave={saveDial}
      onDelete={editingDial ? deleteDial : undefined}
    />

    <SettingsPanel
      open={settingsOpen}
      settings={store.settings}
      onClose={() => (settingsOpen = false)}
      onChange={onSettingsChange}
    />
  </div>
{:else}
  <div
    class="flex h-full items-center justify-center text-sm text-[var(--text-muted)]"
  >
    Loading…
  </div>
{/if}
