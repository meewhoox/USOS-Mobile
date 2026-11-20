# USOS Mobile – Politechnika Śląska

Rozszerzenie dla **Firefoksa na Androida** (WebExtension MV3, Firefox ≥ 128), które zamienia
USOSweb PŚ (`usosweb.polsl.pl`) w wygodną wersję mobilną. Bez zbierania danych, bez zewnętrznych zależności.

## Budowanie i uruchamianie

```sh
npm run build          # → dist/firefox/ (rozpakowane rozszerzenie) + dist/dev-inject.js
npm run watch          # przebudowa przy każdej zmianie w src/
npm run lint           # web-ext lint
npm run run:android    # web-ext na telefonie (USB debugging + adb)
npm run package        # → dist/*.zip
```

Szybki test na komputerze: Firefox → `about:debugging#/runtime/this-firefox` → *Załaduj tymczasowy dodatek* →
`dist/firefox/manifest.json`, potem w popupie rozszerzenia ustaw tryb **Zawsze** (na desktopie tryb
*Automatycznie* nic nie robi – włącza się tylko w przeglądarce telefonu).

## Architektura

USOSweb 7 zbudowany jest z komponentów **Lit** z otwartym Shadow DOM i stylami w `adoptedStyleSheets`
(bez `::part()`), więc zwykły CSS strony nie sięga do ich wnętrza.

| Plik | Świat | Rola |
|---|---|---|
| `src/early.js` | MAIN, `document_start` | meta viewport; dopina nasz arkusz do shadow root każdego komponentu (patch `ShadowRoot.prototype.adoptedStyleSheets` + `attachShadow`); arkusz globalny; atrybuty `data-usm`, `data-usm-theme`, `data-usm-action` na `<html>` |
| `src/content/core.js` | ISOLATED | ustawienia (`storage.local` + lustro w `localStorage` dla synchronicznego startu), i18n PL/EN, helpery DOM, rejestr funkcji i modułów stron |
| `src/content/features/*` | ISOLATED | górny pasek, szuflada z `menu-left`, arkusz konta/ustawień, zakładki, poziome przewijanie tabel |
| `src/content/pages/*` | ISOLATED | moduły konkretnych podstron (`match(action)`) |
| `src/styles/themes.css` | — | motywy = zestawy zmiennych CSS (domyślny / nowoczesny / ciemny) |
| `src/styles/global.css` | — | style dokumentu (light DOM) |
| `src/styles/components/<tag>.css` | — | nadpisania wnętrza komponentu `<tag>` |
| `src/styles/pages/*.css` | — | style podstron, zawężane przez `html[data-usm-action='…']` |

Ustawienia przepływają: popup / arkusz konta → `storage.local` → `core.js` → zdarzenie `usm:settings` →
`early.js` (wypełnia/opróżnia arkusze, bez przeładowania strony).

### Dodawanie poprawek dla podstrony

1. `src/styles/pages/<nazwa>.css` z selektorami `html[data-usm][data-usm-action='modul/akcja'] …`
2. (opcjonalnie) `src/content/pages/<nazwa>.js` z `USM.registerPage({ id, match, mount, unmount })`
   i dopisanie go w `src/manifest.json` przed `content/main.js`.
3. Nowy komponent do nadpisania → `src/styles/components/<tag>.css` (zbierany automatycznie).

### Testowanie w Chrome DevTools (bez instalacji)

Po `npm run build` wykonaj zawartość `dist/dev-inject.js` w konsoli strony USOS z włączoną emulacją
telefonu – wstrzykuje cały kod (ustawienia trzymane wtedy tylko w `localStorage`).
`scripts/audit.js` raportuje elementy wychodzące poza ekran.
