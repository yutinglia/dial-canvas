/** Thin wrapper around browser.i18n with English fallbacks for tests / missing keys. */

const FALLBACKS: Record<string, string> = {
  extName: 'My Speed Dial',
  extDescription: 'A customizable free-form speed dial for your new tab page.',
  loading: 'Loading…',
  edit: 'Edit',
  done: 'Done',
  addDial: 'Add dial',
  settings: 'Settings',
  editMode: 'Edit mode',
  editHint: 'Hover the top-right corner, or click Edit to arrange dials.',
  emptyCanvas: 'No dials on this page yet.',
  emptyCanvasHint: 'Click Edit, then Add dial to get started.',
  searchPlaceholder: 'Search dials…',
  searchNoResults: 'No dials match your search.',
  pageHome: 'Home',
  addPage: 'Add page',
  renamePage: 'Rename page',
  deletePage: 'Delete page',
  confirmDeletePage: 'Delete this page and all of its dials?',
  confirmDeleteDial: 'Delete this dial?',
  confirmReset: 'Reset all dials and settings to defaults? This cannot be undone.',
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
  editDial: 'Edit dial',
  dialCopied: 'URL copied.',
  copyFailed: 'Could not copy URL.',
  saveFailed: 'Failed to save. Your latest changes are kept in this tab.',
  syncFailed: 'Failed to sync from storage.',
  loadFailed: 'Failed to load speed dial data.',
  dialRemovedOne: '1 invalid dial was removed.',
  dialRemovedMany: '$1 invalid dials were removed.',
  invalidDialUrl: 'Dial URL must use http://, https://, or about:.',
  bookmarksImport: 'Import bookmarks',
  bookmarksPermission: 'Bookmarks permission is required to import.',
  bookmarksNone: 'No bookmark URLs found.',
  bookmarksImported: 'Imported $1 bookmark(s).',
  cmdToggleEdit: 'Toggle edit mode',
  cmdAddDial: 'Add a new dial',
  backgroundColor: 'Background color',
  backgroundImage: 'Wallpaper image URL',
  backgroundFit: 'Wallpaper fit',
  backgroundSource: 'Background',
  backgroundSourceColor: 'Color',
  backgroundSourceUrl: 'URL',
  backgroundSourceUpload: 'Upload',
  backgroundSourceBing: 'Bing daily',
  backgroundUpload: 'Wallpaper image',
  backgroundChooseFile: 'Choose image…',
  backgroundBingHint: 'Uses Bing’s daily homepage wallpaper.',
  backgroundBingRefresh: 'Refresh today',
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
  snapThreshold: 'Snap threshold',
  gridSize: 'Grid size',
  snapEnabled: 'Snap to grid (adsorption)',
  iconSize: 'Icon size',
  fontSize: 'Font size',
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
