# Dial Canvas

A Firefox-first browser extension that replaces the new tab page with a free-form, editable speed dials and widgets canvas.

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
npm run zip           # package for distribution (+ sources zip)
npm run submit:firefox  # upload zips to AMO (needs env / secrets)
npm run dev:chrome    # Chromium (best-effort)
npm run build:chrome
npm run check         # svelte-check
npm test              # Vitest unit tests (once)
npm run test:coverage # Vitest + V8 coverage (80% gate on lib/)
npm run test:watch    # Vitest watch mode
```

Unit tests live next to pure modules under `lib/**/*.test.ts` (layout math, Zod/store parsing). Vitest is wired via `wxt/testing/vitest-plugin` so WXT aliases and `browser` polyfills work without a real browser. `npm run test:coverage` fails if lines, statements, functions, or branches on `lib/` drop below 80%.

### Load temporarily in Firefox

1. `npm run build`
2. Open `about:debugging` → **This Firefox**
3. **Load Temporary Add-on…** → select `.output/firefox-mv3/manifest.json`
4. After any code change: run `npm run build` again, then click **Reload** on the temporary addon (or remove and re-load the same `manifest.json`)

Use `.output/firefox-mv3` only. Do **not** load `.output/firefox-mv3-dev` unless `npm run dev` is running (that build expects Vite on localhost).

Temporary add-ons are removed when Firefox restarts, which normally clears `browser.storage.local`. To keep storage across reloads/restarts while developing, set both of these to `true` in `about:config`:

- `extensions.webextensions.keepStorageOnUninstall`
- `extensions.webextensions.keepUuidOnUninstall`

See [Testing persistent and restart features](https://extensionworkshop.com/documentation/develop/testing-persistent-and-restart-features/).

Or use `npm run dev`, which launches Firefox with the extension loaded via web-ext.

## Publishing to Firefox (AMO)

Mozilla must sign the XPI. This repo uses GitHub Actions + [WXT submit](https://wxt.dev/guide/essentials/publishing) so JWT credentials stay in **GitHub Secrets** (never committed).

Extension ID (public, in the manifest): `dial-canvas@yutinglia.dev`

Homepage / source: https://github.com/yutinglia/dial-canvas

Before listing, use:

- [PRIVACY.md](PRIVACY.md) — privacy policy (link this URL on the AMO listing)
- [AMO_REVIEW_NOTES.md](AMO_REVIEW_NOTES.md) — permission justifications for reviewers

### One-time setup

1. Create / log into an [AMO Developer Hub](https://addons.mozilla.org/developers/) account.
2. Create the addon listing once (name, screenshots, etc.). The Action submits **new versions** after that.
3. Create API credentials (JWT issuer + secret) under AMO → **API Keys**.
4. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `FIREFOX_EXTENSION_ID` | `dial-canvas@yutinglia.dev` |
| `FIREFOX_JWT_ISSUER` | AMO JWT issuer |
| `FIREFOX_JWT_SECRET` | AMO JWT secret |

Local `.env` / `.env.submit` files are gitignored. Do not commit them.

### Release flow (bump → tag → AMO)

Runs only from **`main`** (bump / manual release) or **`v*`** tags whose commit is on `main`.

1. Actions → **Bump version** (branch: `main`) → choose `patch` / `minor` / `major` → **Run workflow**
2. That commits the version bump, pushes tag `vX.Y.Z`, and triggers **Release Firefox**
3. The tag run creates a **GitHub Release** (with zip assets) and submits to AMO **listed** (not dry-run)

### CI

**CI** runs `npm run check` and `npm run test:coverage` on every push and pull request (80% coverage gate on `lib/`).

### Dry-run / manual submit

Use **Release Firefox** → **Run workflow** on branch **`main`** to validate credentials without publishing:

1. First run with **dry_run = true** (validates secrets/zips without uploading)
2. Optionally run with **dry_run = false** and channel `listed` or `unlisted`

Listed uploads enter AMO review and publish on approval. Unlisted produces a signed XPI for self-distribution.

### Local submit (optional)

```bash
npm run zip
# export FIREFOX_EXTENSION_ID / FIREFOX_JWT_ISSUER / FIREFOX_JWT_SECRET
npm run submit:firefox -- --firefox-channel listed --dry-run
npm run submit:firefox -- --firefox-channel listed
```

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

[MIT](LICENSE)
