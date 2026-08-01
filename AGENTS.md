# AGENTS.md

Agent guide for **Dial Canvas** (`my-speed-dial-ext`). Human docs: [README.md](README.md).

## Project

Firefox-first Manifest V3 new-tab extension: free-form speed dials and widgets on an editable canvas. Built with WXT + Svelte 5 + Tailwind 4 + Zod 4. Chromium builds are best-effort. No content scripts.

## Commands

```bash
npm install
npm run dev        # WXT + Firefox
npm run build      # Firefox MV3 → .output/firefox-mv3
npm run check      # svelte-check
npm test           # Vitest (once)
```

CI runs `check` + `test`. AMO publish, temp-load, and Chrome scripts: see README.

## Layout

```
entrypoints/     # newtab (primary UI), options (thin shell), background.ts
components/      # canvas, cells, modals, toolbar, widgets/
  settings/      # SettingsPanel section components
lib/
  schemas/       # Zod: dial, widget, settings, store
  storage/       # repository, migrate, storeIo, optional Firefox Sync
  layout/        # DOM-free snap / collision / placement (unit-tested)
  dials/         # favicon, title, bookmarks, wallpaper, Bing actions
  widgets/       # widget domain helpers + createWidget
  settings/      # settings UI helpers (background source, sync label)
  newtab/        # pure page actions for the new-tab hub
public/_locales/ # en, zh_TW
```

## Hard constraints

- TypeScript **~6.x only** — do not adopt TypeScript 7 yet.
- Svelte 5 runes (`$state` / `$derived` / `$effect`); Zod schemas + `z.infer` for persisted models.
- Validate every `storage.local` read with Zod; store migrations live in `lib/storage/migrate.ts`.
- Keep `lib/layout` DOM-free and covered by `lib/**/*.test.ts`.
- Firefox-first; host-permission prompts must run from a user gesture.
- Optional Sync: LWW + chunk quotas; do not advance the LWW clock on seed.
- Dial URLs: `http:`, `https:`, and `about:` only.

## Code style and conventions

- **File size**: do not grow huge source files. Prefer splitting into helpers, subcomponents, or pure modules; when touching a large file, extract the concern you are changing instead of adding more bulk.
- **Separation**: Svelte owns interaction/rendering; domain, math, and persistence live in `lib/`. Do not put layout math or Zod parsing in components.
- **Small focused units**: one concern per module/component; avoid god-components and catch-all util dumps.
- **Naming**: PascalCase Svelte components; camelCase TS files; tests as `*.test.ts` next to modules under `lib/`.
- **Types**: prefer Zod + `z.infer` over duplicate hand-rolled interfaces for persisted data.
- **Svelte**: runes only; keep `<script>` thin — extract non-UI helpers to `lib/`.
- **i18n**: user-visible strings via `t()` and `public/_locales/*/messages.json`; no hard-coded UI copy in new UI.
- **IDs**: use `lib/id.ts` (`crypto.randomUUID()`), not ad-hoc string ids.
- **Modules**: ESM, named exports; match existing import style.
- **Comments**: explain non-obvious *why* (quotas, LWW, seed-clock), not what the next line does.
- **Diff hygiene**: minimal focused changes; no drive-by refactors, unrelated formatting, or new markdown docs unless asked.
- **Deps**: reuse WXT / Svelte 5 / Tailwind 4 / Zod 4 / Vitest; ask before adding packages.

## Boundaries

**Do**

- Run `npm test` and `npm run check` after logic or schema changes.
- Extend Zod schemas and `migrate.ts` when changing store shape.
- Split large files instead of growing them further.

**Ask first**

- New dependencies, new permissions, Sync/store version bumps, AMO/release workflow changes.

**Never**

- Commit `.env` / AMO JWT secrets.
- Edit generated `.wxt/` or `.output/`.
- Add content scripts without an explicit ask.
- Keep stuffing a huge file when a split is practical.
