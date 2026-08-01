<script lang="ts">
  import { onMount } from 'svelte';
  import DialCanvas from '../../components/DialCanvas.svelte';
  import EditToolbar from '../../components/EditToolbar.svelte';
  import DialEditorModal from '../../components/DialEditorModal.svelte';
  import SettingsPanel from '../../components/SettingsPanel.svelte';
  import DialContextMenu from '../../components/DialContextMenu.svelte';
  import WidgetContextMenu from '../../components/WidgetContextMenu.svelte';
  import CanvasContextMenu from '../../components/CanvasContextMenu.svelte';
  import WidgetPickerModal from '../../components/WidgetPickerModal.svelte';
  import WidgetEditorModal from '../../components/WidgetEditorModal.svelte';
  import DialSearchOverlay from '../../components/DialSearchOverlay.svelte';
  import PageTabs from '../../components/PageTabs.svelte';
  import {
    findFirstFreeSlot,
    findNearestFreeSlot,
    occupiedRects,
    type Size,
  } from '../../lib/layout';
  import {
    isAllowedDialUrl,
    type Dial,
  } from '../../lib/schemas/dial';
  import type { Settings } from '../../lib/schemas/settings';
  import type { Widget, WidgetType } from '../../lib/schemas/widget';
  import {
    getActiveDials,
    getActivePage,
    getActiveWidgets,
    withActiveDials,
    withActiveWidgets,
    type Store,
  } from '../../lib/schemas/store';
  import {
    createDebouncedSaver,
    getStore,
  } from '../../lib/storage/repository';
  import { STORAGE_KEYS } from '../../lib/storage/keys';
  import { migrateStore } from '../../lib/storage/migrate';
  import {
    flushPendingSyncPush,
    getSyncEnabled,
    getSyncStatus,
    handleSyncStorageChanged,
    mergeFromSync,
    registerBeforeRemotePersist,
    setSyncEnabled,
    type SyncStatus,
  } from '../../lib/storage/firefoxSync';
  import {
    listBookmarkCandidates,
    requestBookmarksPermission,
  } from '../../lib/dials/bookmarks';
  import type {
    BingWallpaperItem,
    BingWallpaperListResult,
  } from '../../lib/dials/bingWallpaper';
  import {
    applyBackground,
    canvasBackgroundColor as resolveCanvasBackgroundColor,
  } from '../../lib/dials/canvasBackground';
  import {
    ensureBingWallpaper,
    loadBingWallpaperList,
    refreshBingWallpaper,
    selectBingBackground,
    selectBingWallpaperItem,
    type BingActionDeps,
  } from '../../lib/dials/bingBackgroundActions';
  import {
    createDialFromEditor,
    mergeDialFromEditor,
    parseDialEditorValues,
    type DialEditorValues,
  } from '../../lib/dials/fromEditor';
  import { createWidget, defaultSizeForType } from '../../lib/widgets/createWidget';
  import { normalizeWidgetForPersist } from '../../lib/widgets/normalizeWidget';
  import { clampMenuPosition } from '../../lib/ui/contextMenuPosition';
  import {
    addPage as addPageAction,
    deletePage as deletePageAction,
    renamePage as renamePageAction,
    selectPage as selectPageAction,
  } from '../../lib/newtab/pageActions';
  import {
    createResetStore,
    downloadStoreJson,
    formatImportSuccessMessage,
    mergeBookmarksIntoStore,
    parseStoreImportFile,
  } from '../../lib/storage/storeIo';
  import { setLocalePreference, t } from '../../lib/i18n';

  const EDIT_HINT_KEY = 'dial-canvas-edit-hint-seen';

  let store = $state<Store | null>(null);
  let syncEnabled = $state(false);
  let syncStatus = $state<SyncStatus>({});
  let syncBusy = $state(false);
  let editMode = $state(false);
  let settingsOpen = $state(false);
  let editorOpen = $state(false);
  let editingDial = $state<Dial | null>(null);
  let widgetPickerOpen = $state(false);
  let widgetEditorOpen = $state(false);
  let editingWidget = $state<Widget | null>(null);
  let toastMessage = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let showEditHint = $state(false);
  let searchOpen = $state(false);
  let searchQuery = $state('');
  let contextMenu = $state<{
    dial: Dial;
    x: number;
    y: number;
  } | null>(null);
  let widgetContextMenu = $state<{
    widget: Widget;
    x: number;
    y: number;
  } | null>(null);
  let canvasContextMenu = $state<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);
  let pendingPlacement = $state<{ x: number; y: number } | null>(null);

  const activeDials = $derived(store ? getActiveDials(store) : []);
  const activeWidgets = $derived(store ? getActiveWidgets(store) : []);
  /** Locked layout size for placement; falls back to canvas mins before lock. */
  const canvasSize = $derived.by((): Size => {
    if (store?.layoutSize) return store.layoutSize;
    return {
      width: store?.settings.canvasMinWidth ?? 1200,
      height: store?.settings.canvasMinHeight ?? 800,
    };
  });

  function notifyDroppedItems(dials: number, widgets: number) {
    if (dials > 0) {
      showToast(
        dials === 1
          ? t('dialRemovedOne')
          : t('dialRemovedMany', String(dials)),
      );
    }
    if (widgets > 0) {
      showToast(
        widgets === 1
          ? t('widgetRemovedOne')
          : t('widgetRemovedMany', String(widgets)),
      );
    }
  }

  const saver = createDebouncedSaver(200, {
    onError: (error) => {
      console.error('Failed to save speed dial store', error);
      const detail =
        error instanceof Error && error.message
          ? error.message
          : typeof error === 'string'
            ? error
            : '';
      showToast(detail ? `${t('saveFailed')} (${detail})` : t('saveFailed'));
    },
  });

  // Discard pending local flushes before Sync writes remote into storage.local.
  registerBeforeRemotePersist(() => {
    saver.discard();
  });

  function showToast(message: string) {
    toastMessage = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
      toastTimer = undefined;
    }, 4500);
  }

  function storesEqual(a: Store, b: Store): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  const bingDeps = (): BingActionDeps => ({
    getStore: () => store,
    persist,
    showToast,
    t,
  });

  async function applyRemoteStore(next: Store) {
    setLocalePreference(next.settings.locale);
    store = next;
    applyBackground(next.settings);
    if (next.settings.background.type === 'bing') {
      void ensureBingWallpaper(bingDeps(), false);
    }
  }

  async function refreshSyncUiState() {
    syncEnabled = await getSyncEnabled();
    syncStatus = await getSyncStatus();
  }

  async function reconcileFromStorage() {
    try {
      // External storage won — do not flush stale pending over it.
      saver.discard();
      const loaded = await getStore();
      await applyRemoteStore(loaded.store);
      notifyDroppedItems(loaded.droppedDialCount, loaded.droppedWidgetCount);
      if (loaded.unsupportedVersion) {
        showToast(t('storeVersionUnsupported'));
      }
    } catch {
      showToast(t('syncFailed'));
    }
  }

  async function onSyncEnabledChange(enabled: boolean) {
    if (!store || syncBusy) return;
    syncBusy = true;
    try {
      const result = await setSyncEnabled(enabled, store);
      await refreshSyncUiState();
      if (result.action === 'applied') {
        await applyRemoteStore(result.store);
        notifyDroppedItems(result.droppedDialCount, result.droppedWidgetCount);
        showToast(t('firefoxSyncPulled'));
      } else if (result.action === 'pushed') {
        showToast(t('firefoxSyncPushed'));
      } else if (result.action === 'disabled') {
        showToast(t('firefoxSyncDisabled'));
      } else if (result.action === 'error') {
        showToast(t('firefoxSyncFailed'));
      }
      await refreshSyncUiState();
    } catch {
      showToast(t('firefoxSyncFailed'));
      await refreshSyncUiState();
    } finally {
      syncBusy = false;
    }
  }

  function handleCommand(command: string) {
    if (command === 'toggle-edit') {
      toggleEdit();
    } else if (command === 'add-dial') {
      if (!editMode) toggleEdit();
      openAddDial();
    } else if (command === 'search-dials') {
      searchOpen = true;
    }
  }

  onMount(() => {
    try {
      showEditHint = localStorage.getItem(EDIT_HINT_KEY) !== '1';
    } catch {
      showEditHint = true;
    }

    void (async () => {
      try {
        await refreshSyncUiState();
        const loaded = await getStore();
        setLocalePreference(loaded.store.settings.locale);
        store = loaded.store;
        applyBackground(loaded.store.settings);
        if (loaded.store.settings.background.type === 'bing') {
          void ensureBingWallpaper(bingDeps(), false);
        }
        notifyDroppedItems(loaded.droppedDialCount, loaded.droppedWidgetCount);
        if (loaded.unsupportedVersion) {
          showToast(t('storeVersionUnsupported'));
        }

        // Local already present: still pull if Firefox Sync has a newer revision.
        const merged = await mergeFromSync();
        if (merged.action === 'applied') {
          await applyRemoteStore(merged.store);
          notifyDroppedItems(
            merged.droppedDialCount,
            merged.droppedWidgetCount,
          );
        }
        await refreshSyncUiState();
      } catch {
        showToast(t('loadFailed'));
      }
    })();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (contextMenu) {
          contextMenu = null;
          return;
        }
        if (widgetContextMenu) {
          widgetContextMenu = null;
          return;
        }
        if (canvasContextMenu) {
          canvasContextMenu = null;
          return;
        }
        if (searchOpen) {
          searchOpen = false;
          searchQuery = '';
          return;
        }
        if (editorOpen) {
          editorOpen = false;
          editingDial = null;
          pendingPlacement = null;
          return;
        }
        if (widgetPickerOpen) {
          widgetPickerOpen = false;
          pendingPlacement = null;
          return;
        }
        if (widgetEditorOpen) {
          widgetEditorOpen = false;
          editingWidget = null;
          return;
        }
        if (settingsOpen) {
          closeSettings();
          return;
        }
        if (editMode) editMode = false;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'f' &&
        !editorOpen &&
        !widgetEditorOpen &&
        !widgetPickerOpen &&
        !settingsOpen
      ) {
        event.preventDefault();
        searchOpen = true;
      }
    };
    window.addEventListener('keydown', onKey);

    const flushPending = () => {
      void saver.flush().catch(() => {
        // Error already toasted via onError.
      });
      void flushPendingSyncPush();
    };

    const onPageHide = () => {
      flushPending();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onStorageChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName === 'sync') {
        void (async () => {
          const result = await handleSyncStorageChanged(changes);
          if (result.action === 'applied') {
            await applyRemoteStore(result.store);
            notifyDroppedItems(
              result.droppedDialCount,
              result.droppedWidgetCount,
            );
          }
          await refreshSyncUiState();
        })();
        return;
      }

      if (areaName !== 'local') return;

      if (
        STORAGE_KEYS.syncEnabled in changes ||
        STORAGE_KEYS.syncStatus in changes
      ) {
        void refreshSyncUiState();
      }

      const change = changes[STORAGE_KEYS.store];
      if (!change || change.newValue === undefined) return;

      void (async () => {
        if (!store) return;
        const remote = migrateStore(change.newValue);
        if (storesEqual(store, remote)) return;

        if (saver.hasPending()) {
          const pending = saver.peekPending();
          // Own write echo while newer in-memory edits are queued: keep pending.
          if (pending && storesEqual(store, pending)) return;
          // External overwrite (Sync / other tab): drop stale pending.
          saver.discard();
        }
        await applyRemoteStore(remote);
      })();
    };
    browser.storage.onChanged.addListener(onStorageChanged);

    const onMessage = (message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        (message as { type?: string }).type === 'extension-command' &&
        typeof (message as { command?: string }).command === 'string'
      ) {
        handleCommand((message as { command: string }).command);
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    return () => {
      registerBeforeRemotePersist(null);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      browser.storage.onChanged.removeListener(onStorageChanged);
      browser.runtime.onMessage.removeListener(onMessage);
      if (toastTimer) clearTimeout(toastTimer);
      flushPending();
    };
  });

  async function persist(next: Store, immediate = true) {
    setLocalePreference(next.settings.locale);
    store = next;
    applyBackground(next.settings);
    try {
      if (immediate) {
        await saver.saveNow(next);
      } else {
        saver.schedule(next);
      }
    } catch {
      // onError toast already shown; leave in-memory store intact.
    }
  }

  function onDialsChange(dials: Dial[], opts?: { immediate?: boolean }) {
    if (!store) return;
    // Canvas passes full dial objects from possibly-stale props; merge only
    // geometry against the latest store so concurrent body edits survive.
    const current = getActiveDials(store);
    const byId = new Map(dials.map((d) => [d.id, d]));
    const merged = current.map((d) => {
      const next = byId.get(d.id);
      if (!next) return d;
      return {
        ...d,
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
      };
    });
    void persist(withActiveDials(store, merged), opts?.immediate ?? true);
  }

  function onWidgetsChange(widgets: Widget[], opts?: { immediate?: boolean }) {
    if (!store) return;
    const current = getActiveWidgets(store);
    const byId = new Map(widgets.map((w) => [w.id, w]));
    const merged = current.map((w) => {
      const next = byId.get(w.id);
      if (!next) return w;
      return {
        ...w,
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
      };
    });
    void persist(withActiveWidgets(store, merged), opts?.immediate ?? true);
  }

  /** Lock freeform layout size once; never rewrites dial/widget positions. */
  function onLayoutSizeLock(size: Size) {
    if (!store || store.layoutSize) return;
    void persist({ ...store, layoutSize: size }, false);
  }

  function onSettingsChange(
    partial: Partial<Settings>,
    opts?: { immediate?: boolean },
  ) {
    if (!store) return;
    const next: Store = {
      ...store,
      settings: { ...store.settings, ...partial },
    };
    void (async () => {
      // Always write settings immediately — debounce was dropping changes when
      // new-tab pages unloaded before the timer/flush ran.
      await persist(next, opts?.immediate ?? true);
      if (next.settings.background.type === 'bing') {
        void ensureBingWallpaper(bingDeps(), false);
      }
    })();
  }

  async function onSelectBing(): Promise<boolean> {
    return selectBingBackground(bingDeps());
  }

  async function onLoadBingWallpaperList(): Promise<BingWallpaperListResult> {
    return loadBingWallpaperList(bingDeps());
  }

  async function onSelectBingWallpaper(
    item: BingWallpaperItem,
    options: { locked: boolean },
  ) {
    await selectBingWallpaperItem(bingDeps(), item, options);
  }

  async function onRefreshBingWallpaper() {
    await refreshBingWallpaper(bingDeps());
  }

  function closeSettings() {
    settingsOpen = false;
    void saver.flush().catch(() => {
      // Error already toasted via onError.
    });
  }

  function toggleEdit() {
    editMode = !editMode;
    if (editMode && showEditHint) {
      showEditHint = false;
      try {
        localStorage.setItem(EDIT_HINT_KEY, '1');
      } catch {
        // ignore
      }
    }
  }

  function openAddDial() {
    pendingPlacement = null;
    editingDial = null;
    editorOpen = true;
  }

  function openAddDialAt(point: { x: number; y: number }) {
    if (!editMode) toggleEdit();
    editingDial = null;
    editorOpen = true;
    pendingPlacement = point;
  }

  function openEditDial(dial: Dial) {
    editingDial = dial;
    editorOpen = true;
  }

  function closeEditor() {
    editorOpen = false;
    editingDial = null;
    pendingPlacement = null;
  }

  function openAddWidget() {
    pendingPlacement = null;
    widgetPickerOpen = true;
  }

  function openAddWidgetAt(point: { x: number; y: number }) {
    if (!editMode) toggleEdit();
    widgetPickerOpen = true;
    pendingPlacement = point;
  }

  function closeWidgetPicker() {
    widgetPickerOpen = false;
    pendingPlacement = null;
  }

  function openEditWidget(widget: Widget) {
    editingWidget = widget;
    widgetEditorOpen = true;
  }

  function closeWidgetEditor() {
    widgetEditorOpen = false;
    editingWidget = null;
  }

  async function addWidgetOfType(type: WidgetType) {
    if (!store) return;
    widgetPickerOpen = false;
    const dials = getActiveDials(store);
    const widgets = getActiveWidgets(store);
    const size = defaultSizeForType(type, store.settings.gridSize);
    const occupied = occupiedRects(dials, widgets);
    const preferred = pendingPlacement;
    pendingPlacement = null;
    const slot = preferred
      ? findNearestFreeSlot(
          preferred,
          occupied,
          store.settings.gridSize,
          canvasSize,
          size,
        )
      : findFirstFreeSlot(
          occupied,
          store.settings.gridSize,
          canvasSize,
          size,
        );

    const widget = createWidget(type, slot);
    await persist(withActiveWidgets(store, [...widgets, widget]), true);
    if (type === 'weather' || type === 'holidays') {
      openEditWidget(widget);
    }
  }

  async function saveWidget(next: Widget) {
    if (!store) return;
    const normalized = normalizeWidgetForPersist(next);
    const widgets = getActiveWidgets(store).map((w) =>
      w.id === normalized.id ? normalized : w,
    );
    await persist(withActiveWidgets(store, widgets), true);
    closeWidgetEditor();
  }

  function patchWidget(next: Widget) {
    if (!store) return;
    const normalized = normalizeWidgetForPersist(next);
    const widgets = getActiveWidgets(store).map((w) =>
      w.id === normalized.id ? normalized : w,
    );
    void persist(withActiveWidgets(store, widgets), false);
  }

  async function deleteWidgetFromEditor() {
    if (!store || !editingWidget) return;
    const widgets = getActiveWidgets(store).filter(
      (w) => w.id !== editingWidget!.id,
    );
    await persist(withActiveWidgets(store, widgets), true);
    closeWidgetEditor();
  }

  async function deleteWidgetById(widget: Widget) {
    if (!store) return;
    if (!confirm(t('confirmDeleteWidget'))) return;
    const widgets = getActiveWidgets(store).filter((w) => w.id !== widget.id);
    await persist(withActiveWidgets(store, widgets), true);
  }

  function onWidgetContextMenu(widget: Widget, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    contextMenu = null;
    canvasContextMenu = null;
    const { x, y } = clampMenuPosition(
      event.clientX,
      event.clientY,
      160,
      editMode ? 100 : 50,
    );
    widgetContextMenu = { widget, x, y };
  }

  function onDialContextMenu(dial: Dial, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    widgetContextMenu = null;
    canvasContextMenu = null;
    const { x, y } = clampMenuPosition(
      event.clientX,
      event.clientY,
      160,
      editMode ? 160 : 80,
    );
    contextMenu = { dial, x, y };
  }

  function onCanvasContextMenu(
    event: MouseEvent,
    point: { x: number; y: number },
  ) {
    event.preventDefault();
    contextMenu = null;
    widgetContextMenu = null;
    const { x, y } = clampMenuPosition(event.clientX, event.clientY, 160, 200);
    canvasContextMenu = {
      x,
      y,
      canvasX: point.x,
      canvasY: point.y,
    };
  }

  async function saveDial(values: DialEditorValues) {
    if (!store) return;

    const parsed = parseDialEditorValues(values);
    if (!parsed.ok) {
      showToast(t('invalidDialUrl'));
      return;
    }
    const dials = getActiveDials(store);

    if (editingDial) {
      const nextDials = dials.map((d) =>
        d.id === editingDial!.id
          ? mergeDialFromEditor(d, values, parsed.url, parsed.faviconUrl)
          : d,
      );
      await persist(withActiveDials(store, nextDials), true);
    } else {
      const occupied = occupiedRects(dials, getActiveWidgets(store));
      const preferred = pendingPlacement;
      pendingPlacement = null;
      const slot = preferred
        ? findNearestFreeSlot(
            preferred,
            occupied,
            store.settings.gridSize,
            canvasSize,
          )
        : findFirstFreeSlot(
            occupied,
            store.settings.gridSize,
            canvasSize,
          );
      const dial = createDialFromEditor(
        values,
        parsed.url,
        parsed.faviconUrl,
        slot,
      );
      await persist(withActiveDials(store, [...dials, dial]), true);
    }
    closeEditor();
  }

  async function deleteDialFromEditor() {
    if (!store || !editingDial) return;
    const dials = getActiveDials(store).filter((d) => d.id !== editingDial!.id);
    await persist(withActiveDials(store, dials), true);
    closeEditor();
  }

  async function deleteDialById(dial: Dial) {
    if (!store) return;
    if (!confirm(t('confirmDeleteDial'))) return;
    const dials = getActiveDials(store).filter((d) => d.id !== dial.id);
    await persist(withActiveDials(store, dials), true);
  }

  function openDial(dial: Dial) {
    if (!isAllowedDialUrl(dial.url)) return;
    window.location.href = dial.url;
  }

  async function copyDialUrl(dial: Dial) {
    try {
      await navigator.clipboard.writeText(dial.url);
      showToast(t('dialCopied'));
    } catch {
      showToast(t('copyFailed'));
    }
  }

  function selectPage(pageId: string) {
    if (!store) return;
    const next = selectPageAction(store, pageId);
    if (next) void persist(next, true);
  }

  function addPage() {
    if (!store) return;
    void persist(addPageAction(store), true);
  }

  function renamePage(pageId: string) {
    if (!store) return;
    const page = store.pages.find((p) => p.id === pageId);
    if (!page) return;
    const name = prompt(t('renamePage'), page.name);
    if (name == null) return;
    const next = renamePageAction(store, pageId, name);
    if (next) void persist(next, true);
  }

  function deletePage(pageId: string) {
    if (!store) return;
    if (!confirm(t('confirmDeletePage'))) return;
    const next = deletePageAction(store, pageId);
    if (next) void persist(next, true);
  }

  function exportStore() {
    if (!store) return;
    try {
      downloadStoreJson(store);
    } catch {
      showToast(t('exportFailed'));
    }
  }

  async function importStoreFile(file: File) {
    try {
      const migrated = await parseStoreImportFile(file);
      // Force persist even if parse reports unrepaired (import always writes).
      await persist(migrated.store, true);
      showToast(
        formatImportSuccessMessage(
          migrated.droppedDialCount,
          migrated.droppedWidgetCount,
          t,
        ),
      );
      settingsOpen = false;
    } catch {
      showToast(t('importFailed'));
    }
  }

  async function resetStore() {
    if (!confirm(t('confirmReset'))) return;
    await persist(createResetStore(), true);
    showToast(t('resetDone'));
    settingsOpen = false;
  }

  async function importBookmarks() {
    if (!store) return;
    const allowed = await requestBookmarksPermission();
    if (!allowed) {
      showToast(t('bookmarksPermission'));
      return;
    }
    try {
      const bookmarks = await listBookmarkCandidates();
      const result = mergeBookmarksIntoStore(store, bookmarks, canvasSize);
      if (!result.ok) {
        showToast(t('bookmarksNone'));
        return;
      }
      await persist(result.store, true);
      showToast(t('bookmarksImported', String(result.added)));
      settingsOpen = false;
    } catch {
      showToast(t('bookmarksPermission'));
    }
  }

  function canvasBackgroundColor(): string {
    return resolveCanvasBackgroundColor(store?.settings.background);
  }
</script>

{#if store}
  {#key store.settings.locale}
  <div
    class="relative h-full w-full"
    style:background-color={canvasBackgroundColor()}
  >
    <div
      class="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
      style:background-image="var(--canvas-bg-image)"
      style:background-size="var(--canvas-bg-size, cover)"
      style:background-repeat="var(--canvas-bg-repeat, no-repeat)"
      style:background-position="center"
      style:opacity="var(--canvas-bg-opacity, 1)"
    ></div>
    <EditToolbar
      {editMode}
      {showEditHint}
      onToggleEdit={toggleEdit}
      onAddDial={openAddDial}
      onAddWidget={openAddWidget}
      onOpenSettings={() => (settingsOpen = true)}
      onOpenSearch={() => (searchOpen = true)}
    />

    <DialSearchOverlay
      open={searchOpen}
      query={searchQuery}
      onQueryChange={(value) => (searchQuery = value)}
      onClose={() => {
        searchOpen = false;
        searchQuery = '';
      }}
    />

    <main class="h-full w-full">
      <DialCanvas
        dials={activeDials}
        widgets={activeWidgets}
        settings={store.settings}
        layoutSize={store.layoutSize}
        {editMode}
        searchQuery={searchOpen ? searchQuery : ''}
        {onDialsChange}
        {onWidgetsChange}
        onPatchWidget={patchWidget}
        onEditDial={openEditDial}
        onEditWidget={openEditWidget}
        {onLayoutSizeLock}
        onContextMenu={onDialContextMenu}
        onWidgetContextMenu={onWidgetContextMenu}
        onCanvasContextMenu={onCanvasContextMenu}
        onAddDial={openAddDial}
        onAddWidget={openAddWidget}
      />
    </main>

    <PageTabs
      pages={store.pages}
      activePageId={getActivePage(store).id}
      {editMode}
      onSelect={selectPage}
      onAdd={addPage}
      onRename={renamePage}
      onDelete={deletePage}
    />

    <DialEditorModal
      open={editorOpen}
      dial={editingDial}
      globalIconSize={store.settings.iconSize}
      globalFontSize={store.settings.fontSize}
      onClose={closeEditor}
      onSave={saveDial}
      onDelete={editingDial ? deleteDialFromEditor : undefined}
    />

    <WidgetPickerModal
      open={widgetPickerOpen}
      onClose={closeWidgetPicker}
      onPick={addWidgetOfType}
    />

    <WidgetEditorModal
      open={widgetEditorOpen}
      widget={editingWidget}
      onClose={closeWidgetEditor}
      onSave={saveWidget}
      onDelete={editingWidget ? deleteWidgetFromEditor : undefined}
    />

    <SettingsPanel
      open={settingsOpen}
      settings={store.settings}
      {syncEnabled}
      {syncStatus}
      {syncBusy}
      onClose={closeSettings}
      onChange={onSettingsChange}
      onExport={exportStore}
      onImportFile={importStoreFile}
      onReset={resetStore}
      onImportBookmarks={importBookmarks}
      onSelectBing={onSelectBing}
      onRefreshBing={onRefreshBingWallpaper}
      onLoadBingList={onLoadBingWallpaperList}
      onSelectBingWallpaper={onSelectBingWallpaper}
      onSyncEnabledChange={onSyncEnabledChange}
      onToast={showToast}
    />

    <DialContextMenu
      dial={contextMenu?.dial ?? null}
      x={contextMenu?.x ?? 0}
      y={contextMenu?.y ?? 0}
      {editMode}
      onClose={() => (contextMenu = null)}
      onEdit={openEditDial}
      onDelete={deleteDialById}
      onOpen={openDial}
      onCopyUrl={copyDialUrl}
    />

    <WidgetContextMenu
      widget={widgetContextMenu?.widget ?? null}
      x={widgetContextMenu?.x ?? 0}
      y={widgetContextMenu?.y ?? 0}
      {editMode}
      onClose={() => (widgetContextMenu = null)}
      onEdit={openEditWidget}
      onDelete={deleteWidgetById}
    />

    <CanvasContextMenu
      open={canvasContextMenu !== null}
      x={canvasContextMenu?.x ?? 0}
      y={canvasContextMenu?.y ?? 0}
      {editMode}
      onClose={() => (canvasContextMenu = null)}
      onToggleEdit={toggleEdit}
      onAddDial={() => {
        if (!canvasContextMenu) return;
        openAddDialAt({
          x: canvasContextMenu.canvasX,
          y: canvasContextMenu.canvasY,
        });
      }}
      onAddWidget={() => {
        if (!canvasContextMenu) return;
        openAddWidgetAt({
          x: canvasContextMenu.canvasX,
          y: canvasContextMenu.canvasY,
        });
      }}
      onOpenSearch={() => (searchOpen = true)}
      onOpenSettings={() => (settingsOpen = true)}
    />

    {#if toastMessage}
      <div
        class="pointer-events-none fixed bottom-16 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-lg px-4 py-2 text-center text-sm shadow-lg"
        style:background="var(--toolbar-bg)"
        style:border="1px solid var(--dial-border)"
        style:color="var(--dial-title)"
        role="status"
      >
        {toastMessage}
      </div>
    {/if}
  </div>
  {/key}
{:else}
  <div
    class="flex h-full items-center justify-center text-sm text-[var(--text-muted)]"
  >
    {t('loading')}
  </div>
{/if}
