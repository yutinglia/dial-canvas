# My Speed Dial

A browser extension that replaces the new tab / home page with a customizable speed dial.

**Firefox-first.** Also targets Chrome, Edge, and other Chromium browsers via WXT/MV3, but those platforms may not be regularly tested.

## Features

- Custom speed dial tiles for quick access to favorite sites
- Configurable layout and appearance
- Local storage for dials and settings (sync backup planned later)

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | [WXT](https://wxt.dev) | Vite-based WebExtension tooling; Firefox-first (`web-ext`), Chromium builds supported |
| Manifest | Manifest V3 | Current WebExtensions standard |
| Language | TypeScript **6.x** | Pin to latest 6.x; see [TypeScript policy](#typescript-policy) |
| UI | [Svelte](https://svelte.dev) 5 | New tab / options UI |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 | Via `@tailwindcss/vite` |
| Validation | [Zod](https://zod.dev) 4 | Schemas for dials, settings, import/export |
| Persistence | `browser.storage.local` | Primary store; sync backup may be added later |

Use the **latest** compatible releases when installing (current targets as of setup):

| Package | Target |
| --- | --- |
| `wxt` | `^0.21.2` |
| `@wxt-dev/module-svelte` | `^2.0.5` |
| `typescript` | `~6.0.3` (6.x only) |
| `svelte` | `^5.56.8` |
| `tailwindcss` / `@tailwindcss/vite` | `^4.3.3` |
| `zod` | `^4.4.3` |

### TypeScript policy

- **Use TypeScript 6** (latest `6.x` patch).
- **Do not adopt TypeScript 7 yet** — too new; breaks too much of the toolchain.
- Keep watching ecosystem readiness (WXT, Svelte, Vite, Tailwind, Zod, `@types/*`). Move to 7 when the stack is stable with it.

### Storage

- **Now:** `browser.storage.local` for dials and settings.
- **Later:** optional sync / backup path (e.g. `browser.storage.sync` or export/import) without changing the local-first model.

## Development

### Prerequisites

- Node.js (current LTS)
- [Firefox](https://www.mozilla.org/firefox/) (recent stable) — primary test browser
- Chrome / Edge / Chromium optional (builds may work; not guaranteed tested)

### Scripts (planned)

```bash
npm install
npm run dev          # WXT + Firefox (web-ext) — default
npm run build        # production build (Firefox / Chromium targets via WXT)
npm run zip          # package for distribution
```

### Load manually (temporary)

**Firefox (primary):**

1. Open `about:debugging`
2. Click **This Firefox**
3. Click **Load Temporary Add-on…**
4. Select the built extension’s `manifest.json`

**Chromium (untested / best-effort):** use `chrome://extensions` → Developer mode → Load unpacked → select the build output folder.

### Project layout (planned)

```
my_speed_dial_ext/
├── entrypoints/
│   ├── newtab/          # chrome_url_overrides.newtab
│   ├── background.ts
│   └── options/         # optional settings UI
├── lib/                 # shared utils, Zod schemas, storage helpers
├── assets/
├── public/icons/
├── wxt.config.ts
├── package.json
└── README.md
```

## License

TBD
