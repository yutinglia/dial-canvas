# AMO review notes — Dial Canvas

Reviewer-oriented notes for [Dial Canvas](https://github.com/yutinglia/dial-canvas) (`dial-canvas@yutinglia.dev`). Paste the **Notes to Reviewer** section below into the AMO submission form when uploading a version. Privacy summary: [PRIVACY.md](PRIVACY.md).

## Notes to Reviewer

```text
Dial Canvas (dial-canvas@yutinglia.dev) — Notes for reviewers

SUMMARY
Firefox-first MV3 new-tab override: free-form speed dials and widgets on an
editable canvas. Primary UI is the new tab page; the options page is a thin
pointer to Settings. There are NO content scripts and no Dial Canvas backend,
analytics, or ads.

SOURCE CODE / BUILD (required — code is bundled with WXT + Vite + Svelte)
Toolchain is open source and runs locally. package-lock.json is included.

Build environment used for the submitted package:
- OS: Ubuntu (GitHub Actions ubuntu-latest)
- Node.js 22.x + matching npm (npm ci)
- Do not use a different major Node version if you need a bit-identical build

Reproduce the submitted extension from the attached sources zip:
1. Extract the sources zip
2. npm ci
3. npm run build
4. Built extension is in: .output/firefox-mv3/
   (compare that folder to the uploaded XPI / extension zip)

Alternatively: npm run zip  → produces the Firefox zip and sources zip under .output/

Permissions
- storage — persist dials, widgets, pages, settings in browser.storage.local
- unlimitedStorage — local wallpaper data URLs / larger layout caches can exceed default quota
- optional: bookmarks — requested only on user gesture when importing bookmarks as dials
- optional host access http://*/* and https://*/* — requested only on user gesture for:
  · fetching dial page titles / favicons (hosts are user-defined dial URLs)
  · Bing wallpaper
  · Open-Meteo weather
  · Nager.Date holidays
  Broad patterns are needed because dial URLs are arbitrary user-chosen sites.
  These permissions are not used for background browsing of the open web.

Firefox data collection (gecko.data_collection_permissions)
- required: none
- optional: locationInfo — only if the user chooses weather “current location”
  (browser geolocation prompt). Coordinates are used for forecast requests and
  local widget cache only.

Network endpoints (feature-gated; after optional host permission)
- User dial hosts (http/https) for title/favicon
- Bing HP image archive / CDN (wallpaper)
- geocoding-api.open-meteo.com, api.open-meteo.com (weather)
- date.nager.at (holidays)

Optional Firefox Sync uses browser.storage.sync (LWW chunking). Large uploaded
wallpapers and large custom favicons are omitted from sync.

How to test quickly
1. Install the add-on → open a new tab
2. Add/edit dials; toggle edit mode (Alt+E)
3. Settings: background, sync, import bookmarks (optional permission prompt)
4. Weather “current location” triggers geolocation + optional locationInfo

Public source / privacy
- https://github.com/yutinglia/dial-canvas
- https://github.com/yutinglia/dial-canvas/blob/main/PRIVACY.md
```

## What the add-on does

Firefox-first Manifest V3 new-tab override: free-form speed dials and widgets on an editable canvas. Primary UI is the new tab page; the options page is a thin pointer to Settings on new tab. There are **no content scripts**.

## Permissions

| Permission | Required? | Justification |
| --- | --- | --- |
| `storage` | Yes | Persist dials, widgets, pages, and settings via `browser.storage.local`. |
| `unlimitedStorage` | Yes | Local wallpaper data URLs and other layout caches can exceed the default quota. |
| `bookmarks` | Optional | Requested only when the user imports bookmarks into dials (user gesture). |
| Host access `http://*/*`, `https://*/*` | Optional | Requested on user gesture for dial title/favicon fetch, Bing wallpaper, Open-Meteo weather, and Nager.Date holidays. Broad patterns are required because dial URLs are arbitrary user-chosen sites. Not used for browsing the open web in the background. |

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

## Source code / build (AMO)

Source must be attached for every version: the extension is bundled with WXT + Vite + Svelte, so the uploaded XPI is not human-readable as TypeScript sources.

### Build environment

Matches release CI (`.github/workflows/release-firefox.yml`):

| Item | Value |
| --- | --- |
| OS | Ubuntu (`ubuntu-latest` on GitHub Actions) |
| Node.js | **22.x** (specify this for reviewers; Mozilla’s default may differ) |
| Package manager | `npm ci` with committed `package-lock.json` |
| Toolchain | Open source, local only (WXT, Vite, Svelte, Tailwind) |

### Reproduce the submitted package

From the attached sources zip:

```bash
npm ci
npm run build
```

Built extension: `.output/firefox-mv3/` — compare this folder to the uploaded XPI / Firefox zip.

Alternatively:

```bash
npm run zip
```

Produces both the Firefox distribution zip and the sources zip under `.output/`.

## Build / ID

- Public extension ID: `dial-canvas@yutinglia.dev`
- Homepage: https://github.com/yutinglia/dial-canvas
- Privacy policy URL for listing: https://github.com/yutinglia/dial-canvas/blob/main/PRIVACY.md
