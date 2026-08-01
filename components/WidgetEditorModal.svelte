<script lang="ts">
  import {
    DEFAULT_DIAL_BACKGROUND_COLOR,
    DEFAULT_DIAL_BACKGROUND_OPACITY,
    isDialBackgroundColor,
  } from '../lib/schemas/dial';
  import type {
    CalendarWidget,
    ClockWidget,
    HolidaysWidget,
    NoteWidget,
    TodoWidget,
    WallpaperInfoWidget,
    WeatherLocation,
    WeatherWidget,
    Widget,
  } from '../lib/schemas/widget';
  import { t } from '../lib/i18n';
  import {
    requestBrowserGeolocation,
    reverseGeocode,
    searchLocations,
    type GeocodeResult,
  } from '../lib/widgets/weather';
  import {
    fetchHolidayCountries,
    type HolidayCountry,
  } from '../lib/widgets/holidays';

  interface Props {
    open: boolean;
    widget: Widget | null;
    onClose: () => void;
    onSave: (widget: Widget) => void;
    onDelete?: () => void;
  }

  let { open, widget, onClose, onSave, onDelete }: Props = $props();

  let format = $state<'12h' | '24h'>('24h');
  let showSeconds = $state(false);
  let showDate = $state(true);
  let units = $state<'metric' | 'imperial'>('metric');
  let location = $state<WeatherLocation | undefined>(undefined);
  let noteTitle = $state('');
  let todoTitle = $state('');
  let weekStartsOn = $state<'sunday' | 'monday'>('monday');
  let countryCode = $state('');
  let holidaysLimit = $state(8);
  let showCopyright = $state(true);
  let fontSizeOverride = $state<number | null>(null);
  let iconSizeOverride = $state<number | null>(null);
  let backgroundColorOverride = $state<string | null>(null);
  let backgroundOpacityOverride = $state<number | null>(null);
  let showWhenNarrow = $state(false);
  let narrowOrderText = $state('');
  let cityQuery = $state('');
  let cityResults = $state<GeocodeResult[]>([]);
  let searching = $state(false);
  let geoBusy = $state(false);
  let error = $state('');
  let searchSeq = 0;
  let countries = $state<HolidayCountry[]>([]);
  let countriesLoading = $state(false);
  let countryFilter = $state('');

  const DEFAULT_WIDGET_FONT_SIZE = 28;
  const DEFAULT_WEATHER_ICON_SIZE = 28;

  const hasCustomBackground = $derived(
    backgroundColorOverride != null || backgroundOpacityOverride != null,
  );
  const effectiveBackgroundColor = $derived(
    backgroundColorOverride ?? DEFAULT_DIAL_BACKGROUND_COLOR,
  );
  const effectiveBackgroundOpacity = $derived(
    backgroundOpacityOverride ?? DEFAULT_DIAL_BACKGROUND_OPACITY,
  );
  const opacityPercent = $derived(
    Math.round(effectiveBackgroundOpacity * 100),
  );
  const effectiveFontSize = $derived(
    fontSizeOverride ?? DEFAULT_WIDGET_FONT_SIZE,
  );
  const effectiveIconSize = $derived(
    iconSizeOverride ?? DEFAULT_WEATHER_ICON_SIZE,
  );

  const filteredCountries = $derived.by(() => {
    const q = countryFilter.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q),
    );
  });

  const editTitleKey = $derived.by(() => {
    if (!widget) return 'editWidget';
    switch (widget.type) {
      case 'clock':
        return 'editClockWidget';
      case 'weather':
        return 'editWeatherWidget';
      case 'note':
        return 'editNoteWidget';
      case 'todo':
        return 'editTodoWidget';
      case 'calendar':
        return 'editCalendarWidget';
      case 'holidays':
        return 'editHolidaysWidget';
      case 'wallpaperInfo':
        return 'editWallpaperInfoWidget';
    }
  });

  $effect(() => {
    if (!open || !widget) return;
    backgroundColorOverride = widget.backgroundColor ?? null;
    backgroundOpacityOverride = widget.backgroundOpacity ?? null;
    fontSizeOverride = widget.fontSize ?? null;
    showWhenNarrow = widget.showWhenNarrow ?? false;
    narrowOrderText =
      widget.narrowOrder !== undefined ? String(widget.narrowOrder) : '';
    error = '';
    cityQuery = '';
    cityResults = [];
    countryFilter = '';
    iconSizeOverride = null;

    if (widget.type === 'clock') {
      format = widget.format;
      showSeconds = widget.showSeconds;
      showDate = widget.showDate;
    } else if (widget.type === 'weather') {
      units = widget.units;
      location = widget.location;
      iconSizeOverride = widget.iconSize ?? null;
    } else if (widget.type === 'note') {
      noteTitle = widget.title;
    } else if (widget.type === 'todo') {
      todoTitle = widget.title;
    } else if (widget.type === 'calendar') {
      weekStartsOn = widget.weekStartsOn;
    } else if (widget.type === 'holidays') {
      countryCode = widget.countryCode ?? '';
      holidaysLimit = widget.limit;
      void loadCountries();
    } else if (widget.type === 'wallpaperInfo') {
      showCopyright = widget.showCopyright;
    }
  });

  async function loadCountries() {
    if (countries.length > 0 || countriesLoading) return;
    countriesLoading = true;
    const result = await fetchHolidayCountries();
    countriesLoading = false;
    if (result.ok) {
      countries = result.countries;
    } else {
      error = t('holidaysCountriesFailed');
    }
  }

  async function runCitySearch() {
    const seq = ++searchSeq;
    searching = true;
    error = '';
    const result = await searchLocations(cityQuery);
    if (seq !== searchSeq) return;
    searching = false;
    if (!result.ok) {
      error = t('weatherSearchFailed');
      cityResults = [];
      return;
    }
    cityResults = result.results;
    if (result.results.length === 0) {
      error = t('weatherNoResults');
    }
  }

  async function useMyLocation() {
    geoBusy = true;
    error = '';
    try {
      const coords = await requestBrowserGeolocation();
      const resolved = await reverseGeocode(coords.latitude, coords.longitude);
      location = resolved;
      cityResults = [];
      cityQuery = resolved.name;
    } catch {
      error = t('weatherGeoFailed');
    } finally {
      geoBusy = false;
    }
  }

  function pickLocation(result: GeocodeResult) {
    location = {
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    };
    cityResults = [];
    cityQuery = result.name;
    error = '';
  }

  function applySharedStyle<T extends Widget>(next: T): T {
    if (fontSizeOverride != null) next.fontSize = fontSizeOverride;
    else delete next.fontSize;
    if (hasCustomBackground && isDialBackgroundColor(effectiveBackgroundColor)) {
      next.backgroundColor = effectiveBackgroundColor.toLowerCase();
      next.backgroundOpacity = effectiveBackgroundOpacity;
    } else {
      delete next.backgroundColor;
      delete next.backgroundOpacity;
    }
    next.showWhenNarrow = showWhenNarrow;
    if (showWhenNarrow) {
      const trimmed = narrowOrderText.trim();
      if (trimmed) {
        const n = Number(trimmed);
        if (Number.isInteger(n)) next.narrowOrder = n;
        else delete next.narrowOrder;
      } else {
        delete next.narrowOrder;
      }
    } else {
      delete next.narrowOrder;
    }
    return next;
  }

  function submit() {
    if (!widget) return;
    error = '';

    if (widget.type === 'clock') {
      onSave(
        applySharedStyle({
          ...widget,
          format,
          showSeconds,
          showDate,
        } satisfies ClockWidget),
      );
      return;
    }

    if (widget.type === 'weather') {
      const next: WeatherWidget = { ...widget, units };
      if (location) next.location = location;
      else delete next.location;
      if (iconSizeOverride != null) next.iconSize = iconSizeOverride;
      else delete next.iconSize;
      onSave(applySharedStyle(next));
      return;
    }

    if (widget.type === 'note') {
      onSave(
        applySharedStyle({
          ...widget,
          title: noteTitle,
        } satisfies NoteWidget),
      );
      return;
    }

    if (widget.type === 'todo') {
      onSave(
        applySharedStyle({
          ...widget,
          title: todoTitle,
        } satisfies TodoWidget),
      );
      return;
    }

    if (widget.type === 'calendar') {
      onSave(
        applySharedStyle({
          ...widget,
          weekStartsOn,
        } satisfies CalendarWidget),
      );
      return;
    }

    if (widget.type === 'holidays') {
      const next: HolidaysWidget = {
        ...widget,
        limit: holidaysLimit,
      };
      if (countryCode) next.countryCode = countryCode.toUpperCase();
      else delete next.countryCode;
      onSave(applySharedStyle(next));
      return;
    }

    onSave(
      applySharedStyle({
        ...widget,
        showCopyright,
      } satisfies WallpaperInfoWidget),
    );
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if open && widget}
  <div
    class="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    onclick={onClose}
    onkeydown={onKeydown}
  >
    <div
      class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg p-4 shadow-xl"
      style:background="#1e2229"
      style:border="1px solid var(--dial-border)"
      role="dialog"
      aria-modal="true"
      aria-label={t('editWidget')}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-base font-medium text-[var(--dial-title)]">
          {t(editTitleKey)}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-[var(--text-muted)]"
          onclick={onClose}
        >
          {t('close')}
        </button>
      </div>

      <div class="flex flex-col gap-3">
        {#if widget.type === 'clock'}
          <label class="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {t('clockFormat')}
            <select
              class="rounded-md px-2 py-1.5 text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              bind:value={format}
            >
              <option value="24h">{t('clockFormat24')}</option>
              <option value="12h">{t('clockFormat12')}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm text-[var(--dial-title)]">
            <input type="checkbox" bind:checked={showSeconds} />
            {t('clockShowSeconds')}
          </label>
          <label class="flex items-center gap-2 text-sm text-[var(--dial-title)]">
            <input type="checkbox" bind:checked={showDate} />
            {t('clockShowDate')}
          </label>
        {:else if widget.type === 'weather'}
          <label class="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {t('weatherUnits')}
            <select
              class="rounded-md px-2 py-1.5 text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              bind:value={units}
            >
              <option value="metric">{t('weatherUnitsMetric')}</option>
              <option value="imperial">{t('weatherUnitsImperial')}</option>
            </select>
          </label>

          <div class="flex flex-col gap-1">
            <span class="text-sm text-[var(--text-muted)]">{t('weatherLocation')}</span>
            {#if location}
              <p class="text-sm text-[var(--dial-title)]">{location.name}</p>
            {:else}
              <p class="text-sm text-[var(--text-muted)]">{t('weatherNoLocation')}</p>
            {/if}
            <div class="mt-1 flex gap-2">
              <input
                class="min-w-0 flex-1 rounded-md px-2 py-1.5 text-sm text-[var(--dial-title)]"
                style:background="#14161c"
                style:border="1px solid var(--dial-border)"
                placeholder={t('weatherCityPlaceholder')}
                bind:value={cityQuery}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runCitySearch();
                  }
                }}
              />
              <button
                type="button"
                class="shrink-0 rounded-md px-2.5 py-1.5 text-sm"
                style:background="var(--toolbar-bg)"
                style:border="1px solid var(--dial-border)"
                style:color="var(--dial-title)"
                disabled={searching || !cityQuery.trim()}
                onclick={() => void runCitySearch()}
              >
                {searching ? t('weatherSearching') : t('weatherSearch')}
              </button>
            </div>
            <button
              type="button"
              class="mt-1 self-start rounded-md px-2.5 py-1.5 text-sm"
              style:background="var(--toolbar-bg)"
              style:border="1px solid var(--dial-border)"
              style:color="var(--dial-title)"
              disabled={geoBusy}
              onclick={() => void useMyLocation()}
            >
              {geoBusy ? t('weatherLocating') : t('weatherUseMyLocation')}
            </button>
            {#if cityResults.length > 0}
              <ul
                class="mt-1 max-h-40 overflow-y-auto rounded-md"
                style:border="1px solid var(--dial-border)"
              >
                {#each cityResults as result (result.name + result.latitude + result.longitude)}
                  <li>
                    <button
                      type="button"
                      class="block w-full px-2.5 py-1.5 text-left text-sm text-[var(--dial-title)] hover:bg-white/5"
                      onclick={() => pickLocation(result)}
                    >
                      {result.name}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {:else if widget.type === 'note'}
          <label class="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {t('title')}
            <input
              class="rounded-md px-2 py-1.5 text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              bind:value={noteTitle}
              placeholder={t('noteTitlePlaceholder')}
            />
          </label>
          <p class="text-xs text-[var(--text-muted)]">{t('noteEditorHint')}</p>
        {:else if widget.type === 'todo'}
          <label class="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {t('title')}
            <input
              class="rounded-md px-2 py-1.5 text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              bind:value={todoTitle}
              placeholder={t('todoTitlePlaceholder')}
            />
          </label>
          <p class="text-xs text-[var(--text-muted)]">{t('todoEditorHint')}</p>
        {:else if widget.type === 'calendar'}
          <label class="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {t('calendarWeekStartsOn')}
            <select
              class="rounded-md px-2 py-1.5 text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              bind:value={weekStartsOn}
            >
              <option value="monday">{t('calendarWeekStartsMonday')}</option>
              <option value="sunday">{t('calendarWeekStartsSunday')}</option>
            </select>
          </label>
        {:else if widget.type === 'holidays'}
          <div class="flex flex-col gap-1">
            <span class="text-sm text-[var(--text-muted)]">{t('holidaysCountry')}</span>
            {#if countryCode}
              <p class="text-sm text-[var(--dial-title)]">
                {countries.find((c) => c.countryCode === countryCode)?.name ??
                  countryCode}
              </p>
            {:else}
              <p class="text-sm text-[var(--text-muted)]">{t('holidaysNoCountry')}</p>
            {/if}
            <input
              class="mt-1 rounded-md px-2 py-1.5 text-sm text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              placeholder={t('holidaysCountrySearch')}
              bind:value={countryFilter}
            />
            {#if countriesLoading}
              <p class="text-xs text-[var(--text-muted)]">{t('holidaysLoadingCountries')}</p>
            {:else}
              <ul
                class="mt-1 max-h-40 overflow-y-auto rounded-md"
                style:border="1px solid var(--dial-border)"
              >
                {#each filteredCountries as country (country.countryCode)}
                  <li>
                    <button
                      type="button"
                      class="block w-full px-2.5 py-1.5 text-left text-sm text-[var(--dial-title)] hover:bg-white/5 {country.countryCode ===
                      countryCode
                        ? 'bg-white/5'
                        : ''}"
                      onclick={() => {
                        countryCode = country.countryCode;
                        error = '';
                      }}
                    >
                      {country.name}
                      <span class="text-[var(--text-muted)]"
                        >({country.countryCode})</span
                      >
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <label class="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {t('holidaysLimit')}
            <input
              type="number"
              min="1"
              max="20"
              class="rounded-md px-2 py-1.5 text-[var(--dial-title)]"
              style:background="#14161c"
              style:border="1px solid var(--dial-border)"
              bind:value={holidaysLimit}
            />
          </label>
        {:else if widget.type === 'wallpaperInfo'}
          <label class="flex items-center gap-2 text-sm text-[var(--dial-title)]">
            <input type="checkbox" bind:checked={showCopyright} />
            {t('wallpaperInfoShowCopyright')}
          </label>
        {/if}

        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <label class="text-sm text-[var(--text-muted)]" for="widget-font-size">
              {t('fontSize')}
              <span class="ml-1 text-[var(--text-muted)]">
                {effectiveFontSize}px{fontSizeOverride == null
                  ? ` (${t('useDefault').toLowerCase()})`
                  : ''}
              </span>
            </label>
            {#if fontSizeOverride != null}
              <button
                type="button"
                class="rounded px-2 py-0.5 text-xs"
                style:background="var(--toolbar-bg)"
                style:border="1px solid var(--dial-border)"
                style:color="var(--text-muted)"
                onclick={() => (fontSizeOverride = null)}
              >
                {t('useDefault')}
              </button>
            {/if}
          </div>
          <input
            id="widget-font-size"
            type="range"
            min="12"
            max="64"
            step="1"
            value={effectiveFontSize}
            oninput={(e) => {
              fontSizeOverride = Number(
                (e.currentTarget as HTMLInputElement).value,
              );
            }}
          />
        </div>

        {#if widget.type === 'weather'}
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between gap-2">
              <label class="text-sm text-[var(--text-muted)]" for="widget-icon-size">
                {t('iconSize')}
                <span class="ml-1 text-[var(--text-muted)]">
                  {effectiveIconSize}px{iconSizeOverride == null
                    ? ` (${t('useDefault').toLowerCase()})`
                    : ''}
                </span>
              </label>
              {#if iconSizeOverride != null}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:background="var(--toolbar-bg)"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--text-muted)"
                  onclick={() => (iconSizeOverride = null)}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <input
              id="widget-icon-size"
              type="range"
              min="16"
              max="96"
              step="1"
              value={effectiveIconSize}
              oninput={(e) => {
                iconSizeOverride = Number(
                  (e.currentTarget as HTMLInputElement).value,
                );
              }}
            />
          </div>
        {/if}

        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-[var(--text-muted)]"
              >{t('dialBackgroundColor')}</span
            >
            <button
              type="button"
              class="text-xs text-[var(--text-muted)] underline"
              onclick={() => {
                backgroundColorOverride = null;
                backgroundOpacityOverride = null;
              }}
            >
              {t('useDefaultBackground')}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="color"
              value={effectiveBackgroundColor}
              oninput={(e) => {
                backgroundColorOverride = (e.currentTarget as HTMLInputElement)
                  .value;
                if (backgroundOpacityOverride == null) {
                  backgroundOpacityOverride = DEFAULT_DIAL_BACKGROUND_OPACITY;
                }
              }}
            />
            <label class="flex flex-1 flex-col gap-1 text-xs text-[var(--text-muted)]">
              {t('dialBackgroundOpacity')} ({opacityPercent}%)
              <input
                type="range"
                min="0"
                max="100"
                value={opacityPercent}
                oninput={(e) => {
                  const pct = Number(
                    (e.currentTarget as HTMLInputElement).value,
                  );
                  backgroundOpacityOverride = pct / 100;
                  if (backgroundColorOverride == null) {
                    backgroundColorOverride = DEFAULT_DIAL_BACKGROUND_COLOR;
                  }
                }}
              />
            </label>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-[var(--dial-title)]">
          <input type="checkbox" bind:checked={showWhenNarrow} />
          {t('showWhenNarrow')}
        </label>

        {#if showWhenNarrow}
          <label class="block text-sm">
            <span class="mb-1 block text-[var(--text-muted)]"
              >{t('narrowOrder')}</span
            >
            <input
              class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
              style:border-color="var(--dial-border)"
              type="text"
              inputmode="numeric"
              bind:value={narrowOrderText}
              placeholder={t('narrowOrderHint')}
            />
          </label>
        {/if}

        {#if error}
          <p class="text-sm text-[var(--danger)]">{error}</p>
        {/if}

        <div class="mt-1 flex items-center justify-between gap-2">
          {#if onDelete}
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              style:color="var(--danger)"
              onclick={onDelete}
            >
              {t('deleteWidget')}
            </button>
          {:else}
            <span></span>
          {/if}
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              style:background="var(--toolbar-bg)"
              style:border="1px solid var(--dial-border)"
              onclick={onClose}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              style:background="var(--accent)"
              style:color="#0f1216"
              onclick={submit}
            >
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
