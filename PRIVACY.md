# Privacy Policy — Dial Canvas

**Last updated:** 2026-08-02

Dial Canvas (`dial-canvas@yutinglia.dev`) is a browser extension that replaces the new tab page with a free-form dials and widgets canvas. This policy describes what data the extension stores and when it contacts the network.

## Summary

- Your layout and settings stay on your device by default (`browser.storage.local`).
- There is **no Dial Canvas account**, **no first-party server**, **no analytics**, and **no advertising**.
- Optional features (Firefox Sync, bookmarks import, title/favicon fetch, Bing wallpaper, weather, holidays) only run when you use them and may request extra browser permissions.

## Data stored on your device

The extension stores dials, widgets, pages, settings, and related caches (for example wallpaper image data URLs or weather cache) in **`browser.storage.local`** on your computer.

You can export or import a JSON backup, or reset to defaults, from Settings → Data.

## Optional Firefox Sync

If you enable **Sync with Firefox Account**, a slim copy of your layout (dials, widgets, settings; not large uploaded wallpapers or large custom favicons) is written to **`browser.storage.sync`**. Mozilla’s Firefox Sync infrastructure then syncs that data across your signed-in devices according to [Mozilla’s privacy practices](https://www.mozilla.org/privacy/). Dial Canvas does not operate its own sync server.

## Optional network access

Optional host permissions (`http://*/*`, `https://*/*`) are requested only when needed for a feature you trigger (user gesture). Depending on what you use, the extension may contact:

| Feature | Typical destinations | What is sent |
| --- | --- | --- |
| Dial title / favicon fetch | The dial’s own URL (and related icon URLs) | Standard HTTP(S) requests to load the page or icon |
| Bing daily wallpaper | Bing image archive / CDN hosts | Requests for wallpaper metadata and images |
| Weather widget | [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs | Location search text, or coordinates for a forecast |
| Holidays widget | [Nager.Date](https://date.nager.at/) API | Country code / year for public holiday lists |

Dial Canvas does not sell this traffic data. Third-party services apply their own policies to requests they receive.

## Optional bookmarks permission

If you import bookmarks, the extension requests the **`bookmarks`** permission and reads bookmark URLs from the browser to create dials. Bookmark data is not uploaded to a Dial Canvas server.

## Optional location (weather)

The weather widget can use **current location** via the browser’s geolocation prompt. In Firefox this is declared as optional **`locationInfo`** data collection. Coordinates are used only to request a forecast (for example from Open-Meteo) and are stored locally in widget settings/cache as needed for that feature. Location is never required to use the rest of the extension.

## Permissions (overview)

- **`storage` / `unlimitedStorage`**: persist layout, settings, and larger local caches (for example wallpapers).
- **Optional `bookmarks`**: import bookmarks as dials.
- **Optional host permissions**: title/favicon fetch, Bing wallpaper, weather, and holidays network calls.
- **Optional location**: weather “current location” only.

The extension does **not** use content scripts.

## Contact

Questions or privacy requests: open an issue at [github.com/yutinglia/dial-canvas](https://github.com/yutinglia/dial-canvas).

## Changes

Material updates to this policy will be reflected in this file in the repository (and linked from the in-extension About dialog).
