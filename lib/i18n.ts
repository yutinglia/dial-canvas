/** Thin i18n helper with optional in-app locale override over browser.i18n. */

import enMessages from '../public/_locales/en/messages.json';
import zhTwMessages from '../public/_locales/zh_TW/messages.json';

export type LocalePreference = 'system' | 'en' | 'zh_TW';

type ChromeMessages = Record<string, { message: string }>;

function flattenMessages(messages: ChromeMessages): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(messages)) {
    out[key] = value.message;
  }
  return out;
}

const CATALOGS: Record<'en' | 'zh_TW', Record<string, string>> = {
  en: flattenMessages(enMessages as ChromeMessages),
  zh_TW: flattenMessages(zhTwMessages as ChromeMessages),
};

/** Active override catalog; `null` means follow the browser UI locale. */
let activeCatalog: Record<string, string> | null = null;

/** Active locale preference; `system` means follow the browser UI locale. */
let activePreference: LocalePreference = 'system';

const INTL_LOCALES: Record<'en' | 'zh_TW', string> = {
  en: 'en',
  zh_TW: 'zh-TW',
};

export function setLocalePreference(preference: LocalePreference): void {
  activePreference = preference;
  activeCatalog = preference === 'system' ? null : CATALOGS[preference];
}

/**
 * BCP 47 tag for Intl date/time formatting.
 * Returns `undefined` when following the runtime/browser locale.
 */
export function getIntlLocale(): string | undefined {
  if (activePreference !== 'system') return INTL_LOCALES[activePreference];
  try {
    const getUILanguage = browser.i18n?.getUILanguage?.bind(browser.i18n) as
      | (() => string)
      | undefined;
    const ui = getUILanguage?.();
    if (ui) return ui.replaceAll('_', '-');
  } catch {
    // fall through
  }
  return undefined;
}

const FALLBACKS: Record<string, string> = {
  extName: 'My Speed Dial',
  extDescription: 'A customizable free-form speed dial for your new tab page.',
  loading: 'Loading…',
  edit: 'Edit',
  done: 'Done',
  addDial: 'Add dial',
  addWidget: 'Add widget',
  settings: 'Settings',
  editMode: 'Edit mode',
  editHint: 'Hover the top-right corner, or click Edit to arrange dials and widgets.',
  emptyCanvas: 'Nothing on this page yet.',
  emptyCanvasHint: 'Click Edit, then Add dial or Add widget to get started.',
  searchPlaceholder: 'Search dials…',
  search: 'Search',
  searchNoResults: 'No dials match your search.',
  pageHome: 'Home',
  addPage: 'Add page',
  renamePage: 'Rename page',
  deletePage: 'Delete page',
  confirmDeletePage: 'Delete this page and all of its dials and widgets?',
  confirmDeleteDial: 'Delete this dial?',
  confirmDeleteWidget: 'Delete this widget?',
  confirmReset: 'Reset all dials, widgets, and settings to defaults? This cannot be undone.',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  resetDefaults: 'Reset to defaults',
  importSuccess: 'Import complete.',
  importFailed: 'Import failed. Check that the file is a valid Speed Dial backup.',
  exportFailed: 'Export failed.',
  resetDone: 'Reset to defaults.',
  copyUrl: 'Copy URL',
  openDial: 'Open',
  deleteDial: 'Delete',
  deleteWidget: 'Delete',
  editDial: 'Edit dial',
  editWidget: 'Edit widget',
  editClockWidget: 'Edit clock',
  editWeatherWidget: 'Edit weather',
  editNoteWidget: 'Edit note',
  editTodoWidget: 'Edit checklist',
  editCalendarWidget: 'Edit calendar',
  editHolidaysWidget: 'Edit holidays',
  editWallpaperInfoWidget: 'Edit wallpaper info',
  pickWidget: 'Choose a widget type to place on the canvas.',
  widgetClock: 'Clock',
  widgetClockHint: 'Live digital clock with optional date.',
  widgetWeather: 'Weather',
  widgetWeatherHint: 'Current conditions for a city or your location.',
  widgetNote: 'Sticky note',
  widgetNoteHint: 'Free-form text note on the canvas.',
  widgetTodo: 'Checklist',
  widgetTodoHint: 'Local todo list with checkboxes.',
  widgetCalendar: 'Month calendar',
  widgetCalendarHint: 'Browse months with today highlighted.',
  widgetHolidays: 'Public holidays',
  widgetHolidaysHint: 'Upcoming holidays for a country.',
  widgetWallpaperInfo: 'Wallpaper info',
  widgetWallpaperInfoHint: 'Title and credit for the current wallpaper.',
  noteTitlePlaceholder: 'Note title',
  noteTextPlaceholder: 'Write something…',
  noteEditorHint: 'Edit the note text directly on the canvas.',
  todoTitlePlaceholder: 'Checklist title',
  todoAddPlaceholder: 'Add an item…',
  todoAdd: 'Add',
  todoRemoveItem: 'Remove item',
  todoClearCompleted: 'Clear completed',
  todoEditorHint: 'Manage checklist items directly on the canvas.',
  calendarPrev: 'Previous month',
  calendarNext: 'Next month',
  calendarToday: 'Go to current month',
  calendarWeekStartsOn: 'Week starts on',
  calendarWeekStartsMonday: 'Monday',
  calendarWeekStartsSunday: 'Sunday',
  holidaysCountry: 'Country',
  holidaysCountrySearch: 'Search countries…',
  holidaysNoCountry: 'No country set yet.',
  holidaysSetCountry: 'Set country',
  holidaysLoading: 'Loading holidays…',
  holidaysLoadingCountries: 'Loading countries…',
  holidaysFailed: 'Could not load holidays.',
  holidaysCountriesFailed: 'Could not load countries.',
  holidaysEmpty: 'No upcoming holidays.',
  holidaysLimit: 'How many to show',
  wallpaperInfoShowCopyright: 'Show copyright / credit',
  wallpaperInfoWaiting: 'Switch to Bing daily wallpaper to see title and credit.',
  clockFormat: 'Time format',
  clockFormat12: '12-hour',
  clockFormat24: '24-hour',
  clockShowSeconds: 'Show seconds',
  clockShowDate: 'Show date',
  weatherUnits: 'Units',
  weatherUnitsMetric: 'Celsius / km/h',
  weatherUnitsImperial: 'Fahrenheit / mph',
  weatherLocation: 'Location',
  weatherNoLocation: 'No location set yet.',
  weatherCityPlaceholder: 'Search for a city…',
  weatherSearch: 'Search',
  weatherSearching: 'Searching…',
  weatherUseMyLocation: 'Use my location',
  weatherLocating: 'Locating…',
  weatherSetLocation: 'Set location',
  weatherLoading: 'Loading weather…',
  weatherFailed: 'Could not load weather.',
  weatherSearchFailed: 'City search failed.',
  weatherNoResults: 'No matching cities found.',
  weatherGeoFailed: 'Could not get your location.',
  dialCopied: 'URL copied.',
  copyFailed: 'Could not copy URL.',
  saveFailed: 'Failed to save. Your latest changes are kept in this tab.',
  syncFailed: 'Failed to sync from storage.',
  loadFailed: 'Failed to load speed dial data.',
  dialRemovedOne: '1 invalid dial was removed.',
  dialRemovedMany: '$1 invalid dials were removed.',
  widgetRemovedOne: '1 invalid widget was removed.',
  widgetRemovedMany: '$1 invalid widgets were removed.',
  invalidDialUrl: 'Dial URL must use http://, https://, or about:.',
  bookmarksImport: 'Import bookmarks',
  bookmarksPermission: 'Bookmarks permission is required to import.',
  bookmarksNone: 'No bookmark URLs found.',
  bookmarksImported: 'Imported $1 bookmark(s).',
  cmdToggleEdit: 'Toggle edit mode',
  cmdAddDial: 'Add a new dial',
  cmdSearchDials: 'Search dials',
  optionsIntro:
    'Layout, dials, backup (import/export), wallpaper, and pages are edited on the new tab page. Hover or focus the top-right corner to open Settings. Use Edit to arrange dials and widgets.',
  optionsStepOpenTab: 'Open a new tab',
  optionsStepHoverChrome: 'Hover or focus the top-right corner',
  optionsStepClickEditBefore: 'Click',
  optionsStepUseSettingsBefore: 'Use',
  optionsStepUseSettingsAfter: 'for grid, wallpaper, and JSON backup',
  optionsShortcuts:
    'Shortcuts: Alt+E toggle edit · Alt+A add dial · Alt+F search',
  settingsSectionGeneral: 'General',
  settingsSectionLayout: 'Layout',
  settingsSectionCanvas: 'Canvas',
  settingsSectionBackground: 'Background',
  settingsSectionData: 'Data',
  firefoxSyncEnable: 'Sync with Firefox Account',
  firefoxSyncHint:
    'Keeps dials, widgets, and settings in sync across devices. Custom uploaded wallpapers and large favicons are not synced — use Export JSON for a full backup.',
  firefoxSyncOffHint: 'Sync is off. Enable to use Firefox Sync.',
  firefoxSyncEnabledHint: 'Sync is on. Waiting for the first push…',
  firefoxSyncLastSynced: 'Last synced: $1',
  firefoxSyncBusy: 'Updating sync…',
  firefoxSyncQuotaError:
    'Layout is too large for Firefox Sync. Remove some dials/widgets or use Export JSON.',
  firefoxSyncFailed: 'Could not sync with Firefox Account.',
  firefoxSyncPulled: 'Restored layout from Firefox Sync.',
  firefoxSyncPushed: 'Layout saved to Firefox Sync.',
  firefoxSyncDisabled: 'Firefox Sync turned off.',
  language: 'Language',
  languageSystem: 'System',
  languageEn: 'English',
  languageZhTw: '繁體中文',
  backgroundColor: 'Background color',
  backgroundImage: 'Wallpaper image URL',
  backgroundFit: 'Wallpaper fit',
  backgroundOpacity: 'Wallpaper opacity',
  backgroundSource: 'Background',
  backgroundSourceColor: 'Color',
  backgroundSourceUrl: 'URL',
  backgroundSourceUpload: 'Upload',
  backgroundSourceBing: 'Bing daily',
  backgroundUpload: 'Wallpaper image',
  backgroundChooseFile: 'Choose image…',
  backgroundBingHint: 'Choose a recent Bing homepage wallpaper.',
  backgroundBingRefresh: 'Refresh today',
  backgroundBingLoading: 'Loading recent wallpapers…',
  backgroundBingListFailed: 'Could not load recent Bing wallpapers.',
  backgroundBingRetry: 'Retry',
  backgroundBingToday: 'Today',
  wallpaperUploading: 'Uploading…',
  wallpaperUploadActive: 'Custom image is active.',
  wallpaperInvalidType: 'Please choose an image file.',
  wallpaperReadFailed: 'Could not read that image file.',
  wallpaperTooLarge: 'Image is too large even after compression.',
  bingFetchFailed: 'Could not fetch Bing daily wallpaper.',
  bingHostPermission: 'Permission needed to fetch Bing wallpaper.',
  fitCover: 'Cover',
  fitContain: 'Contain',
  fitTile: 'Tile',
  canvasMinWidth: 'Min canvas width',
  canvasMinHeight: 'Min canvas height',
  narrowBreakpoint: 'Narrow layout below',
  showWhenNarrow: 'Show when window is narrow',
  narrowOrder: 'Narrow stack order',
  narrowOrderHint: 'Lower first; blank uses position',
  snapThreshold: 'Snap threshold',
  gridSize: 'Grid size',
  snapEnabled: 'Snap to grid',
  iconSize: 'Icon size',
  fontSize: 'Font size',
  dialBackgroundColor: 'Cell background',
  dialBackgroundOpacity: 'Cell transparency',
  useDefaultBackground: 'Use default',
  useDefault: 'Use default',
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  title: 'Title',
  url: 'URL',
  faviconUrl: 'Favicon URL (optional)',
  fetchTitle: 'Fetch title',
  fetching: 'Fetching…',
  fetchTitlePermission: 'Permission needed to fetch page titles.',
  useGlobal: 'Use global',
  dataBackup: 'Backup',
  pages: 'Pages',
};

function applySubstitutions(
  message: string,
  substitutions?: string | string[],
): string {
  if (substitutions === undefined) return message;
  const list = Array.isArray(substitutions) ? substitutions : [substitutions];
  return message.replace(/\$(\d+)/g, (_, n: string) => {
    const idx = Number(n) - 1;
    return list[idx] ?? '';
  });
}

export function t(
  key: string,
  substitutions?: string | string[],
): string {
  const fromCatalog = activeCatalog?.[key];
  if (fromCatalog) return applySubstitutions(fromCatalog, substitutions);

  try {
    const getMessage = browser.i18n?.getMessage?.bind(browser.i18n) as
      | ((msg: string, substitutions?: string | string[]) => string)
      | undefined;
    const fromExt = getMessage?.(key, substitutions);
    if (fromExt) return fromExt;
  } catch {
    // fall through
  }
  const fallback = FALLBACKS[key] ?? key;
  return applySubstitutions(fallback, substitutions);
}
