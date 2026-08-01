<script lang="ts">
  import { t } from '../../lib/i18n';
  import type { WeatherWidget as WeatherWidgetModel } from '../../lib/schemas/widget';
  import {
    fetchCurrentWeather,
    formatTemperature,
    formatWindSpeed,
    type CurrentWeather,
  } from '../../lib/widgets/weather';
  import { hasWeatherNetworkAccess } from '../../lib/widgets/weatherNetworkAccess';

  interface Props {
    widget: WeatherWidgetModel;
    onSetLocation?: () => void;
  }

  let { widget, onSetLocation }: Props = $props();

  let weather = $state<CurrentWeather | null>(null);
  let loading = $state(false);
  let error = $state('');
  let needsPermission = $state(false);
  let fetchSeq = 0;

  const DEFAULT_ICON_SIZE = 28;

  const iconGlyph: Record<CurrentWeather['condition']['icon'], string> = {
    clear: '☀',
    partly: '⛅',
    cloud: '☁',
    fog: '〰',
    drizzle: '🌦',
    rain: '🌧',
    snow: '❄',
    storm: '⛈',
  };

  async function loadWeather() {
    const location = widget.location;
    if (!location) {
      weather = null;
      error = '';
      needsPermission = false;
      loading = false;
      return;
    }
    const seq = ++fetchSeq;
    loading = true;
    error = '';
    needsPermission = false;
    const allowed = await hasWeatherNetworkAccess();
    if (seq !== fetchSeq) return;
    if (!allowed) {
      loading = false;
      weather = null;
      needsPermission = true;
      return;
    }
    const result = await fetchCurrentWeather(location, widget.units);
    if (seq !== fetchSeq) return;
    loading = false;
    if (result.ok) {
      weather = result.weather;
      error = '';
    } else {
      error = result.error;
    }
  }

  $effect(() => {
    void widget.id;
    void widget.units;
    void widget.location?.latitude;
    void widget.location?.longitude;
    void widget.location?.name;
    void loadWeather();
  });

  const iconSize = $derived(widget.iconSize ?? DEFAULT_ICON_SIZE);
  const tempFontSize = $derived(
    widget.fontSize !== undefined
      ? `${widget.fontSize}px`
      : 'clamp(1.35rem, 24%, 2.5rem)',
  );
</script>

<div
  class="flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 px-3 py-2 text-center"
>
  {#if !widget.location}
    <p class="text-sm text-[var(--text-muted)]">{t('weatherSetLocation')}</p>
    {#if onSetLocation}
      <button
        type="button"
        class="mt-1 rounded-md px-2.5 py-1 text-xs"
        style:background="var(--accent)"
        style:color="#0f1216"
        onclick={(e) => {
          e.stopPropagation();
          onSetLocation();
        }}
      >
        {t('weatherSetLocation')}
      </button>
    {/if}
  {:else if needsPermission}
    <p class="text-sm text-[var(--text-muted)]">{t('weatherPermissionNeeded')}</p>
    {#if onSetLocation}
      <button
        type="button"
        class="mt-1 rounded-md px-2.5 py-1 text-xs"
        style:background="var(--accent)"
        style:color="#0f1216"
        onclick={(e) => {
          e.stopPropagation();
          onSetLocation();
        }}
      >
        {t('weatherSetLocation')}
      </button>
    {/if}
  {:else if loading && !weather}
    <p class="text-sm text-[var(--text-muted)]">{t('weatherLoading')}</p>
  {:else if error && !weather}
    <p class="text-sm text-[var(--danger)]">{t('weatherFailed')}</p>
  {:else if weather}
    <div
      class="leading-none"
      style:font-size="{iconSize}px"
      aria-hidden="true"
    >
      {iconGlyph[weather.condition.icon]}
    </div>
    <div
      class="font-semibold tracking-tight text-[var(--dial-title)] tabular-nums"
      style:font-size={tempFontSize}
    >
      {formatTemperature(weather.temperature, weather.units)}
    </div>
    <div class="text-sm text-[var(--dial-title)]">{weather.condition.label}</div>
    <div class="text-xs text-[var(--text-muted)] line-clamp-1">
      {weather.location.name}
    </div>
    <div class="text-xs text-[var(--text-muted)]">
      {formatWindSpeed(weather.windSpeed, weather.units)} · {Math.round(
        weather.humidity,
      )}%
    </div>
  {/if}
</div>
