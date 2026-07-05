# CLAUDE.md — PrivateFinance

Kurzbriefing für Claude. Ziel: das Projekt sofort verstehen, ohne das Modell neu herzuleiten.

## Was das ist
Ein **rein manuelles** Haushalts-Finanztool (React + Vite, reines Frontend, kein Backend,
keine Bankanbindung). Nutzer pflegen **Einnahmen, Fixkosten und Abos** selbst; die App
berechnet daraus **Kosten je Konto**, **Kosten je Person** und den **Geldfluss zwischen den
Konten**. UI durchgehend **auf Deutsch**. Eigene Daten liegen **nur im Browser**
(`localStorage`), niemals auf einem Server.

## Datenmodell (das Herzstück)
Alle Daten hängen an diesen Arrays (siehe `src/data/mockData.js` als Startdaten):

- **accounts**: `{ id, name, type: 'personal'|'joint', owner, balance, currency, color, goal }`
  - `owner` eines **personal**-Kontos = die **Person** (Personen werden daraus abgeleitet,
    nicht hartkodiert — siehe `personsFromAccounts`).
  - `color` = Kontofarbe (Fluss/Karten/Tabellen); Fallback via `src/lib/accountColors.js`.
  - `goal` = optionales Sparziel (€); Fortschritt = balance/goal auf der „Konten"-Seite.
- **incomes**: `{ id, name, amount, rhythm, accountId, executionDay }` (landen auf Privatkonten)
- **standingOrders** (Fixkosten & Abos): `{ id, recipient, amount, rhythm, accountId,
  category, kind: 'fixed'|'subscription', executionDay, nextExecution, monthInterval, split,
  endDate }`
  - **endDate** (optional, `YYYY-MM-DD`) = letzte Zahlung, z. B. Ratenkauf oder gekündigtes
    Abo. Nach dem Enddatum zählt der Posten in **keiner** Auswertung mehr mit
    (`isOrderActive`/`activeOrders`/`monthsRemaining` in selectors.js), bleibt aber in den
    Tabellen sichtbar (ausgegraut, Pill „beendet"). Analyse-Karte „Auslaufende Posten"
    zeigt, wann wie viel Budget frei wird.
  - **Sparen wird über die Kategorie bestimmt**: alles mit `category === 'Sparen'`
    (`SAVINGS_CATEGORY` in categories.js) zählt als Rücklage, **nicht** als Kosten — siehe
    `isSavings(o)` in recurring.js. `householdSummary` trennt `totalCosts` (Nicht-Sparen)
    von `savings` und liefert `surplus` (= Einkommen − Kosten − Sparen),
    `availableWithoutSavings` und `savingsRate`. (`kind: 'savings'` wird aus Kompatibilität
    mit alten Daten noch als Sparen erkannt, ist in der UI aber nicht mehr wählbar.)
  - **split** = wie der Posten auf Personen aufgeteilt wird:
    - `{ mode: 'even' }` – gleichmäßig auf alle Personen (Standard)
    - `{ mode: 'single', person }` – eine Person zahlt alles
    - `{ mode: 'percent', shares: { Person: % } }`
    - `{ mode: 'amount', shares: { Person: € } }` – feste Beträge (z. B. Miete 720/850)

- **transfers** (Umbuchungen): `{ id, label, fromAccountId, toAccountId, amount, rhythm }` —
  explizite Überträge zwischen zwei beliebigen Konten (z. B. Sparen). Erscheinen im
  Geldfluss **zusätzlich** zu den aus Splits abgeleiteten Flüssen (kind 'umbuchung').

Es gibt **keine** `transactions` oder `balanceHistory` mehr. Der Geldfluss (`accountFlows`)
kombiniert: (1) aus Kosten-Splits abgeleitete Flüsse (kind 'kosten') und (2) explizite
Umbuchungen (kind 'umbuchung'). `accountFlows` liefert `flows` (pro Kontopaar summiert, für
die Sankey) und `rows` (einzeln, mit `kind`, für die Tabelle).

`rhythm ∈ {monthly, quarterly, yearly}`; Normalisierung auf Monatsbasis über
`toMonthly` (yearly ÷ 12, quarterly ÷ 3) in `src/lib/normalize.js`.

## Wichtige Module
- `src/lib/recurring.js` — **alle Auswertungen**: `monthlyByAccount` (inkl. `reserve` =
  Monatsanteil nicht-monatlicher Posten), `monthlyByCategory`, `monthlyByPerson`,
  `incomeByPerson`, `personSummary`, `householdSummary`, `accountFlows` (Geldfluss aus
  Splits), `personShareMonthly`, `personsFromAccounts`, `monthlyInflowByAccount` (Zufluss
  je Konto = Posten + eingehende Umbuchungen; Grundlage der Sparziel-Prognose auf
  „Konten"). Alle Auswertungen filtern beendete Posten (`endDate` überschritten) über
  `activeOrders` heraus. (Ein früherer Fairness-Check wurde auf Nutzerwunsch entfernt –
  nicht wieder einbauen.)
- `src/lib/orderForm.js` — Umwandlung Formularzeile ↔ Posten (`orderToForm`, `formToOrder`,
  `makeNewOrder`). Von „Meine Daten" **und** dem Übersichts-Editor genutzt.
- `src/lib/selectors.js` — Datum/Kategorie/`upcomingPayments` + Enddatum-Logik
  (`isOrderActive`, `activeOrders`, `monthsRemaining`).
- `src/lib/categories.js` — **vordefinierte** Kategorien + Auto-Zuordnung (`KEYWORD_RULES`,
  `autoCategorize`). IDs bleiben stabil (referenziert von `SAVINGS_CATEGORY`/Regeln).
- `src/lib/categoryStore.js` — **eigene Kategorien** (hinzufügen/umbenennen/farbig machen,
  `localStorage`). `getCategories()` liefert vordefiniert+eigene gemergt; `categoryColor`/
  `categoryLabel` für Anzeige. Standard-Kategorien nicht löschbar (nur Label/Farbe editierbar),
  eigene voll löschbar. UI-Komponenten rufen `getCategories()` direkt auf (kein Prop-Drilling).
- `src/lib/sorting.js` — generische Spalten-Sortierung (`sortRows`, `nextSortState`) für
  Tabellen in „Meine Daten"/„Konten"/`RecurringEditor`.
- `src/lib/layout.js` — `useDragOrder(pageKey, defaultOrder)`-Hook: Drag-&-Drop-Reihenfolge von
  Dashboard-Karten, pro Seite in `localStorage` (`pf_layout_<page>`) gespeichert.
- `src/lib/merge.js` — legt manuelle Browser-Daten über die Startdaten. Konten: die
  manuelle Liste **ersetzt** die Basis (gelöschte Konten bleiben gelöscht).
- `src/lib/storage.js` — `localStorage` (Kategorie-Overrides + manuelle Daten).
- `src/lib/claudeExport.js` — analyse-fertiger JSON-Export für Claude.
- `src/lib/csvImport.js` — CSV-Umsätze parsen (Trennzeichen-Erkennung, deutsche
  Zahlen/Datum), Spalten-Auto-Mapping, `detectRecurring` (Gruppierung nach Empfänger,
  Rhythmus-Schätzung) für den Import.
- `src/components/RecurringEditor.jsx` — **wiederverwendbare** inline-editierbare Kosten-Tabelle
  (inkl. Split-Editor + Spalten-Sortierung). Voll kontrolliert: `orders` rein, `onChange(next)` raus.
- `src/components/CostsTable.jsx` — Click-to-Edit-Ansicht derselben Daten (Kosten & Abos-Seite).
- `src/components/InlineAmount.jsx` — Klick-zum-Bearbeiten Betragsfeld (Konten-Salden/-Sparziele).
- `src/components/DragCard.jsx` — Wrapper für per Griff verschiebbare Dashboard-Abschnitte
  (Übersicht, Analyse); `draggable` nur während Griff-Mousedown aktiv, damit Klicks/Inputs
  im Karteninhalt nicht gestört werden.

## Seiten (`src/pages/`, Routing in `src/App.jsx` per `page`-State)
Sidebar-Navigation in Gruppen (Übersicht · Planen: Konten, Kosten & Abos · Auswerten:
Analyse · Daten: CSV-Import, Kategorien, Meine Daten).
`App.navigate(page, params)` kann Vorfilter an „Kosten & Abos" übergeben
(`{ accountId, category, person, kind, search }` → `initial`-Prop von StandingOrders).
**Klick-Navigation**: Konto-Karten/-Balken, Personen-Zeilen, anstehende Posten, Abo-Radar-
und Auslaufend-Zeilen springen gefiltert dorthin; Donut-Segmente öffnen einen Drilldown
(Einzelposten) direkt in der Karte. Geldfluss: Sankey (volle Breite) + klickbare
Fluss-Liste darunter mit bidirektionalem Highlighting.
Übersicht (**reines Dashboard**: KPIs mit Icons, Geldfluss, Kosten je Konto/Person,
anstehende Posten; Bearbeiten-Button führt zu „Kosten & Abos"; Abschnitte per Drag & Drop
sortierbar) · Konten (Salden/Sparziele **klick-editierbar**, Sortier-Chips,
**Deckungs-Hinweis** bei Saldo < Monatslast, **Sparziel-Prognose** aus
`monthlyInflowByAccount`) · Kosten & Abos (Click-to-Edit + Filter, Spalte **Ende**) ·
CSV-Import · Analyse (Donut, Treemap, Abo-Radar, **Auslaufende Posten**, Balken, Karten per
Drag & Drop sortierbar) · Kategorien (eigene anlegen/umbenennen/farbig machen) · Meine Daten
(Settings, Tabellen spaltensortierbar). Responsive: Tabellen mit `.resp-table` werden am
Handy zu Karten (data-label).

## Design / Theme
Schrift: **Inter Variable** (gebundelt via `@fontsource-variable/inter`, Import in
`main.jsx`). Akzent = Indigo-Verlauf (`--accent` → `--accent-2`), Karten 16px-Radius,
Sidebar mit Gruppen-Labels und Logo-Mark.
Hell + Dunkel: Umschalter in der Sidebar, gespeichert in `localStorage` (`pf_theme`),
Default = Systemeinstellung. Umsetzung über CSS-Variablen in `index.css`
(`[data-theme='dark']`-Block); **keine hartkodierten Farben** in Komponenten-CSS verwenden,
immer Variablen (`--card-bg`, `--surface-2`, `--chip-*`, `--pill-*`, `--info-*` …).
Chart.js-Grundfarben werden in `App.jsx` je Theme gesetzt; `<main key={theme}>` baut die
Charts beim Umschalten neu auf.

## Konventionen
- Deutsch in UI, Kommentaren und Commit-relevanten Texten.
- Beträge über `formatEUR`; Datumsparsing lokal über `parseLocalDate` (kein `toISOString`).
- Editieren persistiert über `App.handleSaveManual` / `handleSaveOrders` → `storage`.
- Neue Auswertungen gehören in `recurring.js` (nicht in Komponenten).

## Befehle
- `npm run dev` — Dev-Server (Base `/`).
- `npm run build` — Production-Build. **Achtung:** `vite.config.js` setzt beim Build
  `base: '/privatefinance/'` (GitHub Pages). `vite preview` liefert dann unter
  `/privatefinance/`; zum lokalen Testen im Browser ist `npm run dev` (Base `/`) einfacher.
- `npm run mcp` — MCP-Server (liest die Startdaten aus `mockData.js`).
- Kein Linter/keine Tests konfiguriert; **Build** ist der Sanity-Check.

## Datenschutz
Die Startdaten in `mockData.js` sind echte Beispieldaten des Nutzers und **im Repo sichtbar**
(bewusst so gewählt). Echte Nutzereingaben in der App bleiben im `localStorage`.
