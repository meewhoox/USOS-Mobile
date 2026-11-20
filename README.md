# USOS Mobile – Politechnika Śląska

Aplikacja na Androida (WebView), która pokazuje USOSweb PŚ (`usosweb.polsl.pl`) w wygodnej wersji mobilnej.
Bez zbierania danych, bez zewnętrznych zależności w JS. Android 8.0+ (API 26), APK instalowany ręcznie.

## Budowanie i uruchamianie

Android Studio → *Open* → katalog `android/` → Run (telefon z debugowaniem USB albo emulator).

Wymaga `node` w `PATH`: Gradle przed każdym buildem uruchamia `node scripts/build.mjs`, który z `src/` generuje
`android/app/src/main/assets/usm.js` (style + skrypty interfejsu) i `usm-cas.js` (styl strony logowania CAS).

```sh
cd android && ./gradlew assembleDebug   # JDK 17+, np. jbr z Android Studio jako JAVA_HOME
npm run build                           # same skrypty: assets/usm*.js + dist/dev-inject.js
npm run watch                           # przebudowa przy każdej zmianie w src/
```

Debugowanie strony w aplikacji: `chrome://inspect` na komputerze (tylko build debug).

## Architektura

USOSweb 7 zbudowany jest z komponentów **Lit** z otwartym Shadow DOM i stylami w `adoptedStyleSheets`
(bez `::part()`), więc zwykły CSS strony nie sięga do ich wnętrza.

`MainActivity.kt` wstrzykuje `usm.js` przez `WebViewCompat.addDocumentStartJavaScript` (przed renderem USOS-a),
obsługuje przycisk Wstecz (najpierw zamyka otwarte arkusze przez `USM.back()`), otwiera linki spoza USOS-a
i CAS-u w przeglądarce, a pliki pobiera przez `DownloadManager` z ciasteczkami sesji.

| Plik | Rola |
|---|---|
| `src/early.js` | meta viewport; dopina nasz arkusz do shadow root każdego komponentu (patch `ShadowRoot.prototype.adoptedStyleSheets` + `attachShadow`); arkusz globalny; atrybuty `data-usm`, `data-usm-theme`, `data-usm-action` na `<html>` |
| `src/content/core.js` | ustawienia (motyw, w `localStorage`), i18n PL/EN, helpery DOM, rejestr funkcji i modułów stron |
| `src/content/features/*` | górny pasek, arkusz podstron z `menu-left`, dolna nawigacja, arkusz konta/ustawień, poziome przewijanie tabel |
| `src/content/pages/*` | moduły konkretnych podstron (`match(action)`) |
| `src/content/main.js` | montuje funkcje i moduły stron, `USM.back()` |
| `src/cas/cas.css` | poprawki strony logowania `usoscas.polsl.pl` |
| `src/styles/themes.css` | motywy = zestawy zmiennych CSS (domyślny / nowoczesny / ciemny) |
| `src/styles/global.css` | style dokumentu (light DOM) |
| `src/styles/components/<tag>.css` | nadpisania wnętrza komponentu `<tag>` |
| `src/styles/pages/*.css` | style podstron, zawężane przez `html[data-usm-action='…']` |

Zmiana motywu: arkusz konta → `USM.storage.set()` → `localStorage` + zdarzenie `usm:settings` → `early.js`
(zmienia `data-usm-theme`, bez przeładowania strony).

### Dodawanie poprawek dla podstrony

1. `src/styles/pages/<nazwa>.css` z selektorami `html[data-usm][data-usm-action='modul/akcja'] …`
2. (opcjonalnie) `src/content/pages/<nazwa>.js` z `USM.registerPage({ id, match, mount })`
   i dopisanie go do listy `SCRIPTS` w `scripts/build.mjs` przed `content/main.js`.
3. Nowy komponent do nadpisania → `src/styles/components/<tag>.css` (zbierany automatycznie).

### Testowanie w Chrome DevTools (bez telefonu)

Po `npm run build` wykonaj zawartość `dist/dev-inject.js` w konsoli strony USOS z włączoną emulacją
telefonu. `scripts/audit.js` raportuje elementy wychodzące poza ekran.
