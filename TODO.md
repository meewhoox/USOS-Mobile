# TODO: poprawki po przeglądzie wszystkich podstron (2026-11-20)

Przegląd: wszystkie pozycje menu (Aktualności, Mój USOSweb, Dla studentów, Dla wszystkich, Katalog) + wyszukiwarka
przedmiotów, w Chrome DevTools MCP z emulacją telefonu 390×844. Nic się nie wysypało: górny pasek i dolna nawigacja
są na każdej stronie, brak błędów naszych skryptów, arkusz podstron, arkusz konta, zmiana motywu na żywo i `USM.back()`
działają. Poniżej to, co jest nieprzyjazne dla telefonu lub błędne.

Stan repo (2026-11-20): ostatni commit `c1e91ce`; po nim doszły poprawka `.usm-hscroll` (patrz „Zrobione”)
i narzędzia testowe (`scripts/audit.js`, `dist/test-setup.js`) — sprawdź `git status`, czy są już zacommitowane.

## Zrobione w trakcie przeglądu

- `.usm-hscroll` dostał `position: relative`. Na `dla_stud/rejestracja/kalendarz` ukryte etykiety USOS
  `.screen-reader-only` (`position: absolute`) w komórkach tabeli uciekały z przewijanego pudełka i poszerzały
  layout viewport do 414 px (mimo `overflow-x: clip` na `<html>`). Zweryfikowane: wraca do 390 px.

## Priorytet 1: tabele, które trzeba przerobić na karty

1. **Wyniki wyszukiwania przedmiotów** — `katalog2/przedmioty/szukajPrzedmiotu&_pattern=programowanie`.
   Tabela (z `table-nav-bar` nad nią): kolumna „Kod przedmiotu” zajmuje pół szerokości, „Nazwa jednostki” ucięta,
   „Nazwa przedmiotu” poza ekranem. Karta: nazwa przedmiotu (link) → kod → jednostka.
   Nad wynikami są też opcje „pokazuj grupy / skrócony opis / cykle…” — wychodzą poza prawą krawędź.
2. **Oceny** — `dla_stud/studia/oceny/index`. Tabela w `.usm-hscroll`, ~12 wierszy. Kolumna programu
   („InfAu-SI7 (InfAu-SI7-3(5))”) ściśnięta do ~45 px (kilka znaków w linii), link „szczegóły” ucięty przy krawędzi.
   Karta: przedmiot [kod] → ocena(y) → szczegóły; program jako drobny dopisek.
3. **Lista wniosków** — `dodatki/wnioski/index`. Dwie tabele po ~609 px; „Organizator” i akcje poza ekranem,
   daty w kolumnie „Tury” (`span.note`) łamią się co kilka znaków (~60 px).
4. **Obiegówki** — `dodatki/obiegowka/obiegowki` (stary komponent filtrów/tabeli, URL z `#sff=…&sft=…`).
   Pola filtra wychodzą poza prawą krawędź szarej ramki (ucięte), duża lupa po lewej zabiera ~1/3 szerokości,
   nagłówki tabeli ucięte („Wyd…”, „Nazw…”), przyciski „POPRZEDNIA/NASTĘPNA STRONA” wielkimi literami, ciasne.

Do rozważenia: wspólny mechanizm w `features/content.js` (tabela → karty z `data-label` z nagłówków) zamiast
osobnego kodu dla każdej strony; strony z `pages/*.js` tylko gdy układ wymaga więcej.

## Priorytet 2: średnie

5. **Szerokie tabele bez podpowiedzi przewijania** (podpięcia `dla_stud/studia/podpiecia/lista` — 5 tabel,
   kalendarz rejestracji `news/rejestracje/index`, preferencje prywatności, …). Przewijają się w bok w `.usm-hscroll`,
   ale nic nie sygnalizuje kolejnych kolumn → cień/gradient przy prawej krawędzi, gdy jest co przewijać.
   W `news/rejestracje/index` link w ostatniej kolumnie („kalendarz rejestracji tej jednostki”) ma `nowrap` — zawijać.
   Ogólnie: komórki z `white-space: nowrap` (np. `td` z datami w `dla_stud/rejestracja/kalendarz`) rozpychają tabele.
6. **Listy radio z opisami** — `home/preferencje/preferencjePrywatnosci`, `dodatki/dane/zdj_do_legitymacji/pokazFormularz`:
   tytuł i opis opcji zlewają się w jeden blok, brak odstępów między opcjami, małe kółka wyśrodkowane do kilku linii.
   `home/preferencje/preferencjeUsosweb`: kółko „500” zostaje na końcu linii, a napis przechodzi niżej
   (para radio+label powinna być nierozdzielna). Strona ma też 78 małych celów dotyku i ~6400 px wysokości.
7. **Motyw ciemny: `info-box`** zostaje jasny (białe tło, ciemny tekst) — widać np. na ocenach. Potrzebny
   `src/styles/components/info-box.css` na zmiennych `--usm-*`. Sprawdzić też `notice-box`.
8. **`info-box` w ogóle**: szeroki kolorowy pasek (~50 px) z ikoną po lewej; na ocenach dwa pudełka zajmują cały
   pierwszy ekran. Węższy pasek / ikona w linii, mniejsze marginesy; ewentualnie zwijanie długich.
9. **Formularz wyszukiwania + „Filtry”** w katalogu zajmują >2 ekrany przed wynikami → zwijać na stronie wyników.
10. **Stare formularze**: niskie pola z drobnym tekstem („nazwa planu” w `home/plany/index`, „Temat” w
    `home/usos_mail/nowaWiadomosc`). USOSmail ma etykiety (Od/Do/Temat) w osobnej kolumnie tabeli — na telefonie
    etykieta nad polem. Rozważyć globalne `min-height` ~40–44 px i `font-size: 16px` dla `input/select/textarea`
    (16 px zapobiega też zoomowaniu przy fokusie).

## Priorytet 3: drobne

11. **Nazwa w górnym pasku** (`src/content/features/topbar.js` → `pageName()`, `sectionName()`; `cap()` w `core.js`):
    - `cap()` robi „mLegitymacja” → „MLegitymacja” (nie zmieniać, gdy druga litera jest wielka);
    - wpisy menu WIELKIMI literami są zamieniane na małe → „Preferencje usosweb” zamiast „Preferencje USOSweb”;
    - na `dla_stud/studia/podania/listaZlozonych` i `dla_stud/studia/podpiecia/lista` najgłębszy zaznaczony link
      w `menu-left` to ogólne „lista” → w pasku „Lista”; brać rodzica („podania”/„podpięcia”), gdy etykieta jest ogólna
      (lista, wgrywanie?) — podobnie `zdj_do_legitymacji/pokazFormularz` pokazuje „Wgrywanie”;
    - na stronie 403 (`dodatki/koordynowanieWnioskow/index`) pasek pokazuje „Lista wniosków”.
12. **Arkusz podstron** (`submenu.js`, `components/main-panel.css`): przycisk zamknięcia (kółko) dotyka prawej
    krawędzi ekranu; wpisy wielkimi literami („REJESTRACJE NA EGZAMINY”, „MOJE STUDIA”) wyglądają jak nagłówki,
    a są linkami.
13. **Obwódka fokusu**: po zamknięciu arkusza (`close()` → `this.btn.focus()`) na przycisku sekcji w górnym pasku
    zostaje biała obwódka. Przy dotyku nie przywracać fokusu albo stylować tylko `:focus-visible`.
14. **Mini-plany na „Mój USOSweb”** (`usos-timetable[mini]` w `home/index`): ~połowa szerokości, tekst ~8 px
    (37 elementów < 12 px). Rozciągnąć na całą szerokość.
15. **Daty w kolumnach ~75 px** — `dla_stud/rejestracja/brdg2/index` („2026-09-28 12:15:00” w trzech liniach).
16. **Małe cele dotyku**: przełącznik lat „2024/25 | 2025/26 | 2026/27” w `home/grupy`.
17. **„Koordynowanie wnioskami”** w menu „Dla wszystkich” daje studentowi 403 (strona USOS). Ewentualnie ukryć link.

## Strony bez uwag

Aktualności (wszystkie pliki `news/default&panel=DOMYSLNY&file=…`, deklaracja dostępności, kontakt, UE),
grupy zajęciowe, sprawdziany, koszyk, rejestracje na egzaminy / preferencje grup, decyzje, zaliczenia etapów,
grupy dziekańskie, rankingi, stypendia, wymiana, ankiety, dyplomy, mLegitymacja, spotkania, mój profil, adresy,
konto bankowe, płatności, wybory, pisma administracyjne, wszystkie strony katalogu (poza wynikami wyszukiwania).

## Jak testować

Procedura i zasady oszczędzania kontekstu są w `CLAUDE.md` („Testing workflow”): `npm run build` →
`dist/test-setup.js` raz na stronie → nawigacje z `initScript` → `window.__usmAudit()` (`scripts/audit.js`),
emulacja `390x844x1`, zrzuty tylko tam, gdzie audyt coś zgłosi. Sprawdzone: audyt wykrywa problem z „Zrobione”
(bez poprawki `iw: 414` i lista `escaped`, z poprawką pusto).
