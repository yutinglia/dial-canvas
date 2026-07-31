# My Speed Dial

A Firefox-first browser extension that replaces the new tab page with a free-form, editable speed dial canvas.

Also targets Chrome / Edge via WXT/MV3 (best-effort; Firefox is the primary test browser).

## Features

- Free-form dials with absolute `x/y/w/h` placement
- Customizable dial titles (auto-fetched from the page URL, always editable)
- Edit mode: drag, resize; optional snap-to-grid (off by default for free-pixel move)
- Grid guides only when snap is enabled
- No-overlap drops (reverts to last valid rect)
- Add / edit / delete dials
- Settings: grid size, snap on/off, solid background color
- Local persistence via `browser.storage.local`

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | [WXT](https://wxt.dev) `^0.21.2` | Vite-based WebExtension tooling |
| Manifest | Manifest V3 | Firefox-first (`web-ext`) |
| Language | TypeScript **~6.0.x** | Do not adopt TypeScript 7 yet |
| UI | Svelte 5 | New tab + thin options page |
| Styling | Tailwind CSS 4 | Via `@tailwindcss/vite` |
| Validation | Zod 4 | Dials, settings, root store |
| Persistence | `browser.storage.local` | Single `store` key |

### TypeScript policy

- Use TypeScript 6 (latest 6.x patch).
- Do not adopt TypeScript 7 until the WXT / Svelte / Vite toolchain is ready.

## Development

### Prerequisites

- Node.js (current LTS)
- Firefox (recent stable) — primary

### Scripts

```bash
npm install
npm run dev           # WXT + Firefox (web-ext)
npm run build         # production build (Firefox MV3)
npm run zip           # package for distribution
npm run dev:chrome    # Chromium (best-effort)
npm run build:chrome
npm run check         # svelte-check
npm test              # Vitest unit tests (once)
npm run test:watch    # Vitest watch mode
```

Unit tests live next to pure modules under `lib/**/*.test.ts` (layout math, Zod/store parsing). Vitest is wired via `wxt/testing/vitest-plugin` so WXT aliases and `browser` polyfills work without a real browser.

### Load temporarily in Firefox

1. `npm run build`
2. Open `about:debugging` → **This Firefox**
3. **Load Temporary Add-on…** → select `.output/firefox-mv3/manifest.json`

Or use `npm run dev`, which launches Firefox with the extension loaded via web-ext.

## Architecture

```
entrypoints/
  newtab/          # chrome_url_overrides.newtab (primary UI)
  options/         # thin shell; settings live on new tab
  background.ts    # minimal MV3 background
components/        # DialCanvas, DialCell, GridOverlay, toolbar, modals
lib/
  schemas/         # Zod: dial, settings, store
  storage/         # repository + migrate stub
  layout/          # pure snap / collision / resolveDrop / placement
  dials/           # favicon helper + seed dials
```

- **Layout math** is DOM-free (`lib/layout`) so snap and no-overlap stay testable.
- **Storage** validates every read with Zod; invalid dials are dropped; missing store seeds defaults.
- **UI** owns edit-mode pointer interaction and debounced saves (~200ms during drag, flush on drop).

## License

TBD
