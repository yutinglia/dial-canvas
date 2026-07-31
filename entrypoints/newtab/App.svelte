<script lang="ts">
  import { onMount } from 'svelte';
  import DialCanvas from '../../components/DialCanvas.svelte';
  import EditToolbar from '../../components/EditToolbar.svelte';
  import DialEditorModal from '../../components/DialEditorModal.svelte';
  import SettingsPanel from '../../components/SettingsPanel.svelte';
  import DialContextMenu from '../../components/DialContextMenu.svelte';
  import WidgetContextMenu from '../../components/WidgetContextMenu.svelte';
  import WidgetPickerModal from '../../components/WidgetPickerModal.svelte';
  import WidgetEditorModal from '../../components/WidgetEditorModal.svelte';
  import DialSearchOverlay from '../../components/DialSearchOverlay.svelte';
  import PageTabs from '../../components/PageTabs.svelte';
  import { createId } from '../../lib/id';
  import {
    defaultClockWidgetSize,
    defaultWeatherWidgetSize,
    findFirstFreeSlot,
    type Rect,
    type Size,
  } from '../../lib/layout';
  import {
    isAllowedDialUrl,
    normalizeDialUrl,
    normalizeFaviconUrl,
    type Dial,
  } from '../../lib/schemas/dial';
  import type { Background, Settings } from '../../lib/schemas/settings';
  import type { Widget, WidgetType } from '../../lib/schemas/widget';
  import {
    createEmptyStore,
    createPage,
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
  import { migrateStore, migrateStoreWithMeta } from '../../lib/storage/migrate';
  import { createSeedDials } from '../../lib/dials/seed';
  import {
    dialsFromBookmarks,
    listBookmarkCandidates,
    requestBookmarksPermission,
  } from '../../lib/dials/bookmarks';
  import {
    requestBingWallpaper,
    requestBingWallpaperList,
    type BingWallpaperItem,
    type BingWallpaperListResult,
    utcDateString,
  } from '../../lib/dials/bingWallpaper';
  import {
    hasFetchHostPermission,
    requestFetchHostPermission,
  } from '../../lib/dials/hostPermission';
  import { t } from '../../lib/i18n';

  const EDIT_HINT_KEY = 'msd-edit-hint-seen';

  let store = $state<Store | null>(null);
  let editMode = $state(false);
  let settingsOpen = $state(false);
  let editorOpen = $state(false);
  let editingDial = $state<Dial | null>(null);
  let widgetPickerOpen = $state(false);
  let widgetEditorOpen = $state(false);
  let editingWidget = $state<Widget | null>(null);
  let canvasSize = $state<Size>({ width: 1200, height: 800 });
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
  let bingFetchInFlight = false;

  const activeDials = $derived(store ? getActiveDials(store) : []);
  const activeWidgets = $derived(store ? getActiveWidgets(store) : []);

  function occupiedRects(
    dials: Dial[] = activeDials,
    widgets: Widget[] = activeWidgets,
  ): Rect[] {
    return [
      ...dials.map((d) => ({
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height,
      })),
      ...widgets.map((w) => ({
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
      })),
    ];
  }

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

  function isBingCacheFresh(
    bg: Extract<Background, { type: 'bing' }>,
  ): boolean {
    if (bg.locked && bg.cachedUrl) return true;
    return Boolean(bg.cachedUrl && bg.cachedDate === utcDateString());
  }

  function applyImageBackground(
    imageUrl: string | undefined,
    fit: string,
    opacity: number,
  ) {
    const root = document.documentElement;
    root.style.setProperty('--canvas-bg', '#1a1d23');
    root.style.setProperty('--canvas-bg-opacity', String(opacity));
    if (!imageUrl) {
      root.style.setProperty('--canvas-bg-image', 'none');
      root.style.setProperty('--canvas-bg-size', 'auto');
      root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
      return;
    }
    root.style.setProperty(
      '--canvas-bg-image',
      `url("${imageUrl.replace(/"/g, '\\"')}")`,
    );
    if (fit === 'tile') {
      root.style.setProperty('--canvas-bg-size', 'auto');
      root.style.setProperty('--canvas-bg-repeat', 'repeat');
    } else if (fit === 'contain') {
      root.style.setProperty('--canvas-bg-size', 'contain');
      root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
    } else {
      root.style.setProperty('--canvas-bg-size', 'cover');
      root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
    }
  }

  function applyBackground(settings: Settings) {
    const root = document.documentElement;
    const bg = settings.background;
    if (bg.type === 'color') {
      root.style.setProperty('--canvas-bg', bg.value);
      root.style.setProperty('--canvas-bg-image', 'none');
      root.style.setProperty('--canvas-bg-size', 'auto');
      root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
      root.style.setProperty('--canvas-bg-opacity', '1');
      return;
    }
    if (bg.type === 'bing') {
      applyImageBackground(bg.cachedUrl, bg.fit, bg.opacity);
      return;
    }
    applyImageBackground(bg.value, bg.fit, bg.opacity);
  }

  async function ensureHostPermissionForBing(): Promise<boolean> {
    let allowed = await hasFetchHostPermission();
    if (!allowed) {
      allowed = await requestFetchHostPermission();
    }
    if (!allowed) {
      showToast(t('bingHostPermission'));
      return false;
    }
    return true;
  }

  function isHostPermissionError(error: string | undefined): boolean {
    return Boolean(error?.toLowerCase().includes('host permission'));
  }

  async function ensureBingWallpaper(force = false) {
    if (!store || store.settings.background.type !== 'bing') return;
    const bg = store.settings.background;
    if (!force && isBingCacheFresh(bg)) {
      applyBackground(store.settings);
      return;
    }
    if (bingFetchInFlight) return;
    bingFetchInFlight = true;
    try {
      // Fetch directly from the newtab page. runtime.sendMessage to background
      // was returning undefined for Bing list/daily requests in Firefox.
      const result = await requestBingWallpaper();
      if (!store || store.settings.background.type !== 'bing') return;
      if (!result?.ok) {
        showToast(
          isHostPermissionError(result?.error)
            ? t('bingHostPermission')
            : t('bingFetchFailed'),
        );
        applyBackground(store.settings);
        return;
      }
      const current = store.settings.background;
      if (
        !force &&
        current.cachedUrl === result.url &&
        current.cachedDate === result.date
      ) {
        applyBackground(store.settings);
        return;
      }
      await persist(
        {
          ...store,
          settings: {
            ...store.settings,
            background: {
              type: 'bing',
              fit: current.fit,
              opacity: current.opacity,
              cachedUrl: result.url,
              cachedDate: result.date,
              locked: false,
            },
          },
        },
        true,
      );
    } catch {
      showToast(t('bingFetchFailed'));
      if (store) applyBackground(store.settings);
    } finally {
      bingFetchInFlight = false;
    }
  }

  async function applyRemoteStore(next: Store) {
    store = next;
    applyBackground(next.settings);
    if (next.settings.background.type === 'bing') {
      void ensureBingWallpaper(false);
    }
  }

  async function reconcileFromStorage() {
    try {
      if (saver.hasPending()) {
        await saver.flush();
      }
      const loaded = await getStore();
      await applyRemoteStore(loaded.store);
      notifyDroppedItems(loaded.droppedDialCount, loaded.droppedWidgetCount);
    } catch {
      showToast(t('syncFailed'));
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
        const loaded = await getStore();
        store = loaded.store;
        applyBackground(loaded.store.settings);
        if (loaded.store.settings.background.type === 'bing') {
          void ensureBingWallpaper(false);
        }
        notifyDroppedItems(loaded.droppedDialCount, loaded.droppedWidgetCount);
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
        if (searchOpen) {
          searchOpen = false;
          searchQuery = '';
          return;
        }
        if (editorOpen) {
          editorOpen = false;
          editingDial = null;
          return;
        }
        if (widgetPickerOpen) {
          widgetPickerOpen = false;
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
      if (areaName !== 'local') return;
      const change = changes[STORAGE_KEYS.store];
      if (!change || change.newValue === undefined) return;

      void (async () => {
        if (saver.hasPending()) {
          await reconcileFromStorage();
          return;
        }
        if (!store) return;
        const remote = migrateStore(change.newValue);
        if (storesEqual(store, remote)) return;
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
    void persist(withActiveDials(store, dials), opts?.immediate ?? true);
  }

  function onWidgetsChange(widgets: Widget[], opts?: { immediate?: boolean }) {
    if (!store) return;
    void persist(withActiveWidgets(store, widgets), opts?.immediate ?? true);
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
        void ensureBingWallpaper(false);
      }
    })();
  }

  async function onSelectBing(): Promise<boolean> {
    if (!store) return false;
    if (!(await ensureHostPermissionForBing())) return false;

    const existing =
      store.settings.background.type === 'bing'
        ? store.settings.background
        : null;
    const imageBg =
      store.settings.background.type === 'image'
        ? store.settings.background
        : null;
    const fit = existing?.fit ?? imageBg?.fit ?? 'cover';
    const opacity = existing?.opacity ?? imageBg?.opacity ?? 1;
    const next: Store = {
      ...store,
      settings: {
        ...store.settings,
        background: {
          type: 'bing',
          fit,
          opacity,
          locked: existing?.locked ?? false,
          ...(existing?.cachedUrl
            ? {
                cachedUrl: existing.cachedUrl,
                cachedDate: existing.cachedDate,
              }
            : {}),
        },
      },
    };
    await persist(next, true);
    void ensureBingWallpaper(false);
    return true;
  }

  async function onLoadBingWallpaperList(): Promise<BingWallpaperListResult> {
    if (!(await ensureHostPermissionForBing())) {
      return { ok: false, error: 'Host permission not granted.' };
    }
    try {
      return await requestBingWallpaperList();
    } catch (err) {
      const detail =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to fetch Bing wallpaper list.';
      return { ok: false, error: detail };
    }
  }

  async function onSelectBingWallpaper(
    item: BingWallpaperItem,
    options: { locked: boolean },
  ) {
    if (!store) return;
    if (store.settings.background.type !== 'bing') return;
    const current = store.settings.background;
    const cachedDate = options.locked ? item.date : utcDateString();
    if (
      current.cachedUrl === item.url &&
      current.cachedDate === cachedDate &&
      current.locked === options.locked
    ) {
      applyBackground(store.settings);
      return;
    }
    await persist(
      {
        ...store,
        settings: {
          ...store.settings,
          background: {
            type: 'bing',
            fit: current.fit,
            opacity: current.opacity,
            cachedUrl: item.url,
            cachedDate,
            locked: options.locked,
          },
        },
      },
      true,
    );
  }

  async function onRefreshBingWallpaper() {
    if (!(await ensureHostPermissionForBing())) return;
    if (store && store.settings.background.type === 'bing') {
      const current = store.settings.background;
      if (current.locked) {
        await persist(
          {
            ...store,
            settings: {
              ...store.settings,
              background: {
                ...current,
                locked: false,
              },
            },
          },
          true,
        );
      }
    }
    void ensureBingWallpaper(true);
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

  function openAddWidget() {
    widgetPickerOpen = true;
  }

  function closeWidgetPicker() {
    widgetPickerOpen = false;
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
    const size =
      type === 'clock'
        ? defaultClockWidgetSize(store.settings.gridSize)
        : defaultWeatherWidgetSize(store.settings.gridSize);
    const slot = findFirstFreeSlot(
      occupiedRects(dials, widgets),
      store.settings.gridSize,
      canvasSize,
      size,
    );

    const base = {
      id: createId(),
      ...slot,
    };

    const widget: Widget =
      type === 'clock'
        ? {
            ...base,
            type: 'clock',
            format: '24h',
            showSeconds: false,
            showDate: true,
          }
        : {
            ...base,
            type: 'weather',
            units: 'metric',
          };

    await persist(withActiveWidgets(store, [...widgets, widget]), true);
    if (type === 'weather') {
      openEditWidget(widget);
    }
  }

  async function saveWidget(next: Widget) {
    if (!store) return;
    const widgets = getActiveWidgets(store).map((w) =>
      w.id === next.id ? next : w,
    );
    await persist(withActiveWidgets(store, widgets), true);
    closeWidgetEditor();
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
    contextMenu = null;
    const pad = 8;
    const menuW = 160;
    const menuH = editMode ? 100 : 50;
    const x = Math.min(event.clientX, window.innerWidth - menuW - pad);
    const y = Math.min(event.clientY, window.innerHeight - menuH - pad);
    widgetContextMenu = {
      widget,
      x: Math.max(pad, x),
      y: Math.max(pad, y),
    };
  }

  function onDialContextMenu(dial: Dial, event: MouseEvent) {
    event.preventDefault();
    widgetContextMenu = null;
    const pad = 8;
    const menuW = 160;
    const menuH = editMode ? 160 : 80;
    const x = Math.min(event.clientX, window.innerWidth - menuW - pad);
    const y = Math.min(event.clientY, window.innerHeight - menuH - pad);
    contextMenu = { dial, x: Math.max(pad, x), y: Math.max(pad, y) };
  }

  async function saveDial(values: {
    title: string;
    url: string;
    faviconUrl?: string;
    iconSize?: number;
    fontSize?: number;
    backgroundColor?: string;
    backgroundOpacity?: number;
  }) {
    if (!store) return;

    const url = normalizeDialUrl(values.url);
    if (!url || !isAllowedDialUrl(url)) {
      showToast(t('invalidDialUrl'));
      return;
    }
    const faviconUrl = normalizeFaviconUrl(values.faviconUrl);
    const dials = getActiveDials(store);

    if (editingDial) {
      const nextDials = dials.map((d) => {
        if (d.id !== editingDial!.id) return d;
        const next: Dial = {
          ...d,
          title: values.title,
          url,
          faviconUrl,
        };
        if (values.iconSize !== undefined) next.iconSize = values.iconSize;
        else delete next.iconSize;
        if (values.fontSize !== undefined) next.fontSize = values.fontSize;
        else delete next.fontSize;
        if (values.backgroundColor !== undefined) {
          next.backgroundColor = values.backgroundColor;
        } else {
          delete next.backgroundColor;
        }
        if (values.backgroundOpacity !== undefined) {
          next.backgroundOpacity = values.backgroundOpacity;
        } else {
          delete next.backgroundOpacity;
        }
        return next;
      });
      await persist(withActiveDials(store, nextDials), true);
    } else {
      const slot = findFirstFreeSlot(
        occupiedRects(dials, getActiveWidgets(store)),
        store.settings.gridSize,
        canvasSize,
      );
      const dial: Dial = {
        id: createId(),
        title: values.title,
        url,
        faviconUrl,
        ...(values.iconSize !== undefined
          ? { iconSize: values.iconSize }
          : {}),
        ...(values.fontSize !== undefined
          ? { fontSize: values.fontSize }
          : {}),
        ...(values.backgroundColor !== undefined
          ? { backgroundColor: values.backgroundColor }
          : {}),
        ...(values.backgroundOpacity !== undefined
          ? { backgroundOpacity: values.backgroundOpacity }
          : {}),
        ...slot,
      };
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
    if (!store || pageId === store.activePageId) return;
    void persist({ ...store, activePageId: pageId }, true);
  }

  function addPage() {
    if (!store) return;
    const page = createPage([], `Page ${store.pages.length + 1}`, createId());
    void persist(
      {
        ...store,
        pages: [...store.pages, page],
        activePageId: page.id,
      },
      true,
    );
  }

  function renamePage(pageId: string) {
    if (!store) return;
    const page = store.pages.find((p) => p.id === pageId);
    if (!page) return;
    const name = prompt(t('renamePage'), page.name)?.trim();
    if (!name) return;
    void persist(
      {
        ...store,
        pages: store.pages.map((p) =>
          p.id === pageId ? { ...p, name } : p,
        ),
      },
      true,
    );
  }

  function deletePage(pageId: string) {
    if (!store || store.pages.length <= 1) return;
    if (!confirm(t('confirmDeletePage'))) return;
    const pages = store.pages.filter((p) => p.id !== pageId);
    const activePageId =
      store.activePageId === pageId ? pages[0]!.id : store.activePageId;
    void persist({ ...store, pages, activePageId }, true);
  }

  function exportStore() {
    if (!store) return;
    try {
      const blob = new Blob([JSON.stringify(store, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-speed-dial-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t('exportFailed'));
    }
  }

  async function importStoreFile(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const migrated = migrateStoreWithMeta(raw);
      // Force persist even if parse reports unrepaired (import always writes).
      await persist(migrated.store, true);
      showToast(
        migrated.droppedDialCount > 0 || migrated.droppedWidgetCount > 0
          ? `${t('importSuccess')} ${[
              migrated.droppedDialCount > 0
                ? migrated.droppedDialCount === 1
                  ? t('dialRemovedOne')
                  : t('dialRemovedMany', String(migrated.droppedDialCount))
                : '',
              migrated.droppedWidgetCount > 0
                ? migrated.droppedWidgetCount === 1
                  ? t('widgetRemovedOne')
                  : t(
                      'widgetRemovedMany',
                      String(migrated.droppedWidgetCount),
                    )
                : '',
            ]
              .filter(Boolean)
              .join(' ')}`
          : t('importSuccess'),
      );
      settingsOpen = false;
    } catch {
      showToast(t('importFailed'));
    }
  }

  async function resetStore() {
    if (!confirm(t('confirmReset'))) return;
    const next = createEmptyStore(createSeedDials());
    await persist(next, true);
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
      if (bookmarks.length === 0) {
        showToast(t('bookmarksNone'));
        return;
      }
      const existing = getActiveDials(store);
      const existingUrls = new Set(existing.map((d) => d.url));
      const fresh = bookmarks.filter((b) => !existingUrls.has(b.url));
      if (fresh.length === 0) {
        showToast(t('bookmarksNone'));
        return;
      }
      const nextDials = dialsFromBookmarks(
        fresh,
        existing,
        store.settings.gridSize,
        canvasSize,
        40,
        getActiveWidgets(store).map((w) => ({
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
        })),
      );
      const added = nextDials.length - existing.length;
      await persist(withActiveDials(store, nextDials), true);
      showToast(t('bookmarksImported', String(added)));
      settingsOpen = false;
    } catch {
      showToast(t('bookmarksPermission'));
    }
  }

  function canvasBackgroundColor(): string {
    if (!store) return 'var(--canvas-bg)';
    const bg = store.settings.background;
    if (bg.type === 'color') return bg.value;
    return 'var(--canvas-bg)';
  }
</script>

{#if store}
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
        {editMode}
        searchQuery={searchOpen ? searchQuery : ''}
        {onDialsChange}
        {onWidgetsChange}
        onEditDial={openEditDial}
        onEditWidget={openEditWidget}
        onCanvasSizeChange={(size) => (canvasSize = size)}
        onContextMenu={onDialContextMenu}
        onWidgetContextMenu={onWidgetContextMenu}
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
{:else}
  <div
    class="flex h-full items-center justify-center text-sm text-[var(--text-muted)]"
  >
    {t('loading')}
  </div>
{/if}
