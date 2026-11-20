# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Firefox for Android extension (WebExtension MV3, Firefox ≥ 128) that restyles USOSweb at Politechnika Śląska (`https://usosweb.polsl.pl`) into a mobile layout. No runtime dependencies, no bundler, no tests. The user communicates in Polish; `README.md` is in Polish.

## Commands

```sh
npm run build        # node scripts/build.mjs → dist/firefox/ (unpacked extension) + dist/dev-inject.js
npm run watch        # rebuild on changes in src/
npm run lint         # web-ext lint (must stay at 0 errors/warnings/notices)
npm run run:android  # web-ext on a phone over adb
npm run package      # zip into dist/
```

`dist/` is generated: edit only `src/`, then rebuild. `src/manifest.json` is the manifest source.

## Testing workflow (no test suite)

Changes are verified visually in the Chrome DevTools MCP browser (the user is logged into USOS there):
1. emulate a phone (e.g. viewport `390x844x3,mobile,touch`, Firefox Android UA),
2. navigate to a USOS page, then `evaluate_script` with `format: "script"` and `sourcePath` = `dist/dev-inject.js` (re-navigate before re-injecting; it guards against double injection),
3. optionally run `scripts/audit.js` the same way. It reports elements overflowing the viewport, tables wrapped for scrolling, small tap targets, and custom elements in the content.

Caveats: in dev-inject mode the CSS is applied after the components render, so you may catch transitions mid-way (e.g. the drawer edge). `fetch`/XHR from the page to `localhost` is blocked by Chrome Private Network Access. Settings in dev mode live only in page `localStorage` (`usm:settings`).

## Architecture

USOSweb 7 is built from **Lit web components with open shadow roots**, styled via `adoptedStyleSheets`, with no `::part()`. Document CSS cannot reach inside them. Main layout elements: `usos-layout`, `cas-bar`, `app-header`, `menu-top`/`menu-top-item`, `main-panel` (slots `left-menu` + `page-body`), `menu-left`, `usos-footer`, `usos-frame`, `usos-dialog`, `usos-module-link-tile*`. Theme colours are USOS CSS vars on `:root` (`--primary`, `--font-color`, `--background-secondary`, …).

**Two content-script worlds:**
- `src/early.js` runs in the **MAIN world at `document_start`**. The build wraps it and injects `USM_CSS = { global, components: {tag: css} }`.
  - Patches `ShadowRoot.prototype.adoptedStyleSheets` (setter) and `Element.prototype.attachShadow`, so every component whose tag has a CSS file always gets our sheet appended **last**.
  - Also patches the document's adoptedStyleSheets for the global sheet.
  - Inserts `<meta name=viewport>`.
  - Sets `data-usm` (mode active), `data-usm-theme` and `data-usm-action` (the `_action` URL param) on `<html>`. `document.documentElement` may not exist yet, hence `whenRoot()`.
  - Activation is synchronous from the `localStorage` mirror `usm:settings`. Toggling only refills or empties the sheets, with no page reload.
- `src/content/*` runs in the **ISOLATED world**. The files share `globalThis.USM` (defined in `core.js`); each file is an IIFE. Load order comes from the `js` array in `src/manifest.json` (`core.js` first, `main.js` last). New page modules must be added there.
  - `core.js`: settings in `storage.local` (falls back to `localStorage` when there are no extension APIs), mirrored to `localStorage` and pushed to MAIN via the `usm:settings` CustomEvent (string `detail`). Also i18n strings PL/EN (by page `lang`), the `h()` DOM builder, inline SVG `icon()`, `waitFor`, `collapsibleFrames` (uses the native `expandable`/`expanded` attributes of `usos-frame`, persisted per page).
  - `features/*`: `{ id, mount(ctx), unmount?, update? }` registered via `USM.registerFeature`, mounted in registration order (topbar must precede drawer/account). `ctx = { settings, action, cas }`.
  - `pages/*`: `USM.registerPage({ id, match(action), mount, unmount })`.
  - `main.js`: reads settings, mounts/unmounts everything when the mode changes; when the mode is off on a phone it puts a "wersja mobilna" link into `cas-bar`'s `extra-actions` slot.
- `src/cas/cas.css`: the login page lives on a different domain (`usoscas.polsl.pl/cas/*`, plain HTML with its own viewport meta). It gets a static manifest `css` content script limited to `@media (max-width: 880px)`, with no settings or JS.
- `popup/` writes the same `settings` object to `storage.local`. Changes propagate live via `storage.onChanged`.

**Styles** (`src/styles/`, concatenated by `scripts/build.mjs`):
- `themes.css`: themes are only sets of custom properties on `html[data-usm][data-usm-theme=…]`. Our tokens are `--usm-*`; the dark and modern themes also override USOS's own vars. Variables inherit into shadow trees, so component CSS should use vars, never theme-specific selectors.
- `global.css`: document/light-DOM rules, scoped with `html[data-usm]`.
- `components/<tag>.css`: injected into that tag's shadow root, picked up automatically by filename. Use `!important` to beat Lit's own sheet; slotted rules with `!important` beat light-DOM `!important`.
- `pages/*.css`: appended to the global sheet; scope with `html[data-usm][data-usm-action='module/action']`.

Behaviour to preserve:
- USOS links use `onclick="return Common.confirmWarnings();"`. Keep existing elements in place or move them, never recreate links.
- The desktop `cas-bar` and `app-header` are hidden. Their data comes from `cas-bar` attributes (`logged-user`, `logout-url`, `passwd-url`, `lang-switch-url`).
- `menu-left` stays in its slot; the drawer is the `[usm-drawer-open]` attribute on `main-panel` plus positioning in `components/main-panel.css`.
- The isolated world cannot see Lit properties or `customElements` (Chrome), so it polls shadow DOM with `waitFor`.

## Product decisions (from the user)

- The only target is Firefox for Android.
- Mobile mode is always on in a phone browser (`/Mobi|Android.+Mobile|iPhone|iPod/` UA). Modes: `auto` / `always` / `off`.
- Themes: `default` (USOS/PŚ colours), `modern` (PŚ navy + gold, deliberately not generic), `dark`.
- Current scope is a "responsive USOS", with navigation kept open for later expansion (e.g. a bottom nav).
- Subpages are reviewed one by one. Done: top-nav landing pages (aktualności, katalog, mój USOSweb, dla studentów, dla wszystkich). Not yet: oceny, sprawdziany, plan zajęć, rejestracje, podania.
