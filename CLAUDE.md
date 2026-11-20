# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Android WebView app (`android/`, Kotlin) that shows USOSweb at Politechnika Śląska (`https://usosweb.polsl.pl`) in a mobile layout. The layout itself is CSS + JS in `src/`, injected into the page. No runtime JS dependencies, no bundler, no tests. The user communicates in Polish; `README.md` is in Polish.

## Commands

```sh
cd android && ./gradlew assembleDebug   # JAVA_HOME = Android Studio's jbr; runs the JS build first
npm run build        # node scripts/build.mjs → android/app/src/main/assets/usm.js, usm-cas.js + dist/dev-inject.js, dist/test-setup.js
npm run watch        # rebuild on changes in src/
```

`dist/` and `android/app/src/main/assets/usm*.js` are generated (gitignored): edit only `src/`.

## Android app (`android/`)

- Gradle 8.13, AGP 8.13.2, Kotlin 2.2.20, minSdk 26, targetSdk/compileSdk 36, package `app.usosmobile`.
- `preBuild` depends on `buildWebAssets`, which runs `node scripts/build.mjs`.
- `MainActivity.kt`:
  - `WebViewCompat.addDocumentStartJavaScript` per origin: `usm.js` on usosweb, `usm-cas.js` on usoscas. Falls back to injecting in `onPageStarted` on old WebViews.
  - Back gesture calls `USM.back()` (closes an open `usos-dialog`, then feature `back()` hooks such as the account and submenu sheets), then `goBack()`.
  - Links outside `usosweb`/`usoscas` open in the system browser. Downloads go through `DownloadManager` with the session cookies.
  - System-bar/IME insets are applied as padding on the root view, so `env(safe-area-inset-*)` is 0 inside the page. Bars use a fixed colour (`#4F4C6A`); they don't follow the theme yet.
  - Debug builds enable `chrome://inspect`.

## Testing workflow (no test suite)

On a device: run from Android Studio, inspect via `chrome://inspect`.

Without a device, in the Chrome DevTools MCP browser (the user is logged into USOS there):
1. `npm run build`, then emulate a phone: viewport **`390x844x1,mobile,touch`** (DPR 1, see below), Android UA.
2. On any USOS page, once per build: `evaluate_script` with `format: "script"`, `sourcePath` = `dist/test-setup.js`. It stores the bundle and `scripts/audit.js` in the page's `localStorage` (`__usmSrc`, `__usmAudit`).
3. For every page: `navigate_page` (url or reload) with `initScript` = `eval(localStorage.getItem('__usmAudit'));eval(localStorage.getItem('__usmSrc'))`. This injects before the page's scripts, like the app. `initScript` applies to one navigation only: pass it every time.
4. `evaluate_script` → `() => window.__usmAudit()` (waits 1.2 s, returns JSON; field meanings in the header of `scripts/audit.js`). Red flags: `iw` (page wider than the screen → the fixed bars move/stretch), `overflow`, `escaped`, `squeezed`, `warns`.
5. When done: remove `__usmSrc`/`__usmAudit` from `localStorage`; if the theme was changed, `USM.storage.set({ theme: 'default' })`.

Important: iterate over all pages only when instructed by the user. Otherwise, test the affected pages plus this smoke set (pages that broke before or are the hardest layouts):
- `home/index` (Mój USOSweb: tiles, mini timetables),
- `home/plan` (timetable, horizontal scroll),
- `dla_stud/rejestracja/kalendarz` (positioned labels in tables once widened the page),
- `dla_stud/studia/oceny/index` (grades table),
- `katalog2/przedmioty/szukajPrzedmiotu&_pattern=programowanie` (search results).

For a full sweep, build the page list from the menus instead of a hard-coded list: `fetch` each section page (`news/default`, `home/index`, `dla_stud/index`, `dodatki/index`, `katalog2/index`), parse it with `DOMParser` and collect `menu-left a[href]`.

Rules (tests run on the user's real account):
- Navigate and open/close our sheets only. Never submit forms or click anything with side effects: registrations, elections, applications, "Zapisz" in preferences, USOSmail send, "Wyloguj", language switch.
- If a page title starts with "Wymagane zalogowanie" (session expired), stop and ask the user to log in. Never try to log in yourself.
- After CSS changes, also check the affected pages in the dark theme (`USM.storage.set({ theme: 'dark' })`, one screenshot), then reset to `default`.
- Chrome can't check app-only behaviour: system-bar/keyboard insets, back button, downloads, hidden native scrollbar, refresh rate. The final check is on the phone; the user saves phone screenshots to their screenshots folder.

Keep context usage low (screenshots are the most expensive tool output):
- DPR 1 (`390x844x1`): a 390×844 screenshot is still readable and costs a fraction of DPR 3.
- Audit first; screenshot only pages the audit flags or where layout must be judged visually. No `fullPage` by default: scroll the problem into view (`evaluate_script` + `scrollTo`) and take a viewport shot, or screenshot one element (`uid` from `take_snapshot`). JPEG.
- `take_snapshot` (accessibility tree as text) for content/structure checks instead of a screenshot.
- Sweeps over multiple pages: hand them to a subagent, so the per-page output stays out of the main context. Decide whether the needed tests are big enough to benefit from that.

Caveats: USOS pages refuse to load in an `iframe`, so every page needs its own navigation. A full-page screenshot shows the bottom nav mid-page (capture artifact). `dist/dev-inject.js` (same bundle) can still be run after load via `sourcePath`, but then the CSS lands after the components render, so you may catch transitions mid-way. `fetch`/XHR from the page to `localhost` is blocked by Chrome Private Network Access.

## Architecture

USOSweb 7 is built from **Lit web components with open shadow roots**, styled via `adoptedStyleSheets`, with no `::part()`. Document CSS cannot reach inside them. Main layout elements: `usos-layout`, `cas-bar`, `app-header`, `menu-top`/`menu-top-item`, `main-panel` (slots `left-menu` + `page-body`), `menu-left`, `usos-footer`, `usos-frame`, `usos-dialog`, `usos-module-link-tile*`. Theme colours are USOS CSS vars on `:root` (`--primary`, `--font-color`, `--background-secondary`, …).

`usm.js` is one bundle (top frame only) running in the page at document start: `early.js` wrapped with the CSS, then the UI scripts in the order of `SCRIPTS` in `scripts/build.mjs`.
- `src/early.js`: the build defines `USM_CSS = { global, components: {tag: css} }` for it.
  - Patches `ShadowRoot.prototype.adoptedStyleSheets` (setter) and `Element.prototype.attachShadow`, so every component whose tag has a CSS file always gets our sheet appended **last**.
  - Also patches the document's adoptedStyleSheets for the global sheet.
  - Inserts `<meta name=viewport>`.
  - Sets `data-usm`, `data-usm-theme` and `data-usm-action` (the `_action` URL param) on `<html>`. `document.documentElement` may not exist yet, hence `whenRoot()`.
  - The theme is read synchronously from `localStorage` `usm:settings`; later changes arrive via the `usm:settings` CustomEvent.
- `src/content/*`: the files share `globalThis.USM` (defined in `core.js`); each file is an IIFE. New page modules must be added to `SCRIPTS` before `content/main.js`.
  - `core.js`: settings (`{ theme }`) in `localStorage`; `USM.storage.set()` saves, fires the `usm:settings` event for `early.js` and notifies `onChange` listeners. Also i18n strings PL/EN (by page `lang`), the `h()` DOM builder, inline SVG `icon()`, `waitFor`, `collapsibleFrames` (uses the native `expandable`/`expanded` attributes of `usos-frame`, persisted per page).
  - `features/*`: `{ id, mount(ctx), update?, back? }` registered via `USM.registerFeature`, mounted in registration order (topbar must precede submenu/account, which hook into its buttons). `ctx = { settings, action, cas }`.
  - Navigation model: `menu-top` is hidden. `topbar.js` shows `[logo USOSweb → Aktualności/home] | [Section › Subpage ▾] [avatar]`. `submenu.js` turns `menu-left` (the current section's subpages, the only menu USOS sends) into a bottom sheet. `bottomnav.js` holds the sections Mój USOSweb / Dla studentów / Dla wszystkich and delegates taps to the original `menu-top-item` link so its `onclick` runs; it is always visible except while a text field is focused (keyboard). "Katalog" is a row in the account sheet; "dla pracowników" is intentionally omitted.
  - `pages/*`: `USM.registerPage({ id, match(action), mount })`.
  - `main.js`: mounts features and matching pages on DOM ready, calls `update()` on settings changes, defines `USM.back()`.
- `src/cas/cas.css`: the login page lives on a different domain (`usoscas.polsl.pl/cas/*`, plain HTML with its own viewport meta). The build wraps it into `usm-cas.js`, which adds it as a `<style>`; rules are limited to `@media (max-width: 880px)`.

**Styles** (`src/styles/`, concatenated by `scripts/build.mjs`):
- `themes.css`: themes are only sets of custom properties on `html[data-usm][data-usm-theme=…]`. Our tokens are `--usm-*`; the dark and modern themes also override USOS's own vars. Variables inherit into shadow trees, so component CSS should use vars, never theme-specific selectors.
- `global.css`: document/light-DOM rules, scoped with `html[data-usm]`.
- `components/<tag>.css`: injected into that tag's shadow root, picked up automatically by filename. Use `!important` to beat Lit's own sheet; slotted rules with `!important` beat light-DOM `!important`.
- `pages/*.css`: appended to the global sheet; scope with `html[data-usm][data-usm-action='module/action']`.

Behaviour to preserve:
- USOS links use `onclick="return Common.confirmWarnings();"`. Keep existing elements in place or move them, never recreate links.
- The desktop `cas-bar` and `app-header` are hidden. Their data comes from `cas-bar` attributes (`logged-user`, `logout-url`, `passwd-url`, `lang-switch-url`).
- `menu-left` stays in its slot; the subpage sheet is the `[usm-drawer-open]` attribute on `main-panel` plus positioning in `components/main-panel.css`.
- Components render asynchronously, so features poll shadow DOM with `waitFor`.

## Product decisions (from the user)

- The only target is the Android app: a sideloaded APK (no Play Store for now), minSdk 26. The mobile layout is always on.
- Themes: `default` (USOS/PŚ colours), `modern` (PŚ navy + gold, deliberately not generic), `dark`.
- Navigation: bottom nav with 3 sections, top-bar section/subpage sheet (decided 2026-11-20). Favourite-page shortcuts are planned for later.
- Subpages are reviewed one by one. Done: top-nav landing pages (aktualności, katalog, mój USOSweb, dla studentów, dla wszystkich). Not yet: oceny, sprawdziany, plan zajęć, rejestracje, podania.
