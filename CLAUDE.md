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

- **accounts**: `{ id, name, type: 'personal'|'joint', owner, balance, currency, color }`
  - `owner` eines **personal**-Kontos = die **Person** (Personen werden daraus abgeleitet,
    nicht hartkodiert — siehe `personsFromAccounts`).
  - `color` = Kontofarbe (Fluss/Karten/Tabellen); Fallback via `src/lib/accountColors.js`.
- **incomes**: `{ id, name, amount, rhythm, accountId, executionDay }` (landen auf Privatkonten)
- **standingOrders** (Fixkosten & Abos & Sparen): `{ id, recipient, amount, rhythm, accountId,
  category, kind: 'fixed'|'subscription'|'savings', executionDay, nextExecution, monthInterval, split }`
  - `kind: 'savings'` = Sparen/Rücklage; zählt **nicht** als Kosten. `householdSummary`
    trennt `totalCosts` (fixed+subscription) von `savings` und liefert `surplus`
    (= Einkommen − Kosten − Sparen), `availableWithoutSavings` und `savingsRate`.
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
  Splits), `personShareMonthly`, `personsFromAccounts`.
- `src/lib/orderForm.js` — Umwandlung Formularzeile ↔ Posten (`orderToForm`, `formToOrder`,
  `makeNewOrder`). Von „Meine Daten" **und** dem Übersichts-Editor genutzt.
- `src/lib/selectors.js` — Datum/Kategorie/`upcomingPayments`.
- `src/lib/categories.js` — Kategorien + Auto-Zuordnung (`KEYWORD_RULES`).
- `src/lib/merge.js` — legt manuelle Browser-Daten über die Startdaten.
- `src/lib/storage.js` — `localStorage` (Kategorie-Overrides + manuelle Daten).
- `src/lib/claudeExport.js` — analyse-fertiger JSON-Export für Claude.
- `src/lib/csvImport.js` — CSV-Umsätze parsen (Trennzeichen-Erkennung, deutsche
  Zahlen/Datum), Spalten-Auto-Mapping, `detectRecurring` (Gruppierung nach Empfänger,
  Rhythmus-Schätzung) für den Import.
- `src/components/RecurringEditor.jsx` — **wiederverwendbare** inline-editierbare Kosten-Tabelle
  (inkl. Split-Editor). Voll kontrolliert: `orders` rein, `onChange(next)` raus.

## Seiten (`src/pages/`, Routing in `src/App.jsx` per `page`-State)
Übersicht (inkl. Inline-Editor + Auto-Speichern) · Kosten & Abos (Filter/Analyse) ·
CSV-Import (Umsätze einlesen → wiederkehrende erkennen → als Posten übernehmen) ·
Analyse (Charts) · Kategorien · Meine Daten (Settings).

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
