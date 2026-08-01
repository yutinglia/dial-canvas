# AMO review notes — Dial Canvas

Reviewer-oriented notes for [Dial Canvas](https://github.com/yutinglia/dial-canvas) (`dial-canvas@yutinglia.dev`). Source of truth for behavior is the repository; privacy summary: [PRIVACY.md](PRIVACY.md).

## What the add-on does

Firefox-first Manifest V3 new-tab override: free-form speed dials and widgets on an editable canvas. Primary UI is the new tab page; the options page is a thin pointer to Settings on new tab. There are **no content scripts**.

## Permissions

| Permission | Required? | Justification |
| --- | --- | --- |
| `storage` | Yes | Persist dials, widgets, pages, and settings via `browser.storage.local`. |
| `unlimitedStorage` | Yes | Local wallpaper data URLs and other layout caches can exceed the default quota. |
| `bookmarks` | Optional | Requested only when the user imports bookmarks into dials (user gesture). |
| Host access `http://*/*`, `https://*/*` | Optional | Requested on user gesture for dial title/favicon fetch, Bing wallpaper, Open-Meteo weather, and Nager.Date holidays. Not used for browsing the open web in the background. |

## Firefox data collection declaration

In `browser_specific_settings.gecko.data_collection_permissions`:

- **Required:** `none`
- **Optional:** `locationInfo` — only when the user chooses weather “current location” (browser geolocation prompt). Coordinates are used for forecast requests and local widget cache; see [PRIVACY.md](PRIVACY.md).

## Network endpoints (feature-gated)

- Dial URLs / favicons: whatever hosts the user configured (http/https/`about:` dials only for stored dials).
- Bing wallpaper: Bing HP image archive / CDN.
- Weather: `geocoding-api.open-meteo.com`, `api.open-meteo.com`.
- Holidays: `date.nager.at`.

No Dial Canvas backend, analytics, or ads.

## Sync

Optional Firefox Sync uses `browser.storage.sync` with last-writer-wins chunking. Large uploaded wallpapers and large custom favicons are omitted from sync; users are directed to Export JSON for full backups.

## Build / ID

- Public extension ID: `dial-canvas@yutinglia.dev`
- Homepage: https://github.com/yutinglia/dial-canvas
- Privacy policy URL for listing: https://github.com/yutinglia/dial-canvas/blob/main/PRIVACY.md
