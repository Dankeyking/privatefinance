# PrivateFinance – Manuelles Haushalts-Finanztool

Ein schlankes Dashboard, um den Haushalt **manuell** im Blick zu behalten: ihr tragt
**Einnahmen, Fixkosten, Abos** und eine **Verteilung** selbst ein und bekommt sofort
übersichtliche Auswertungen – **ohne Bankanbindung**, alles bleibt nur im Browser.

Das Modell passt zu mehreren Konten: **Privatkonten** (z. B. Elisa, Duncan) und mehrere
**gemeinsame Konten** (Gemeinschaft, Haushalt, Urlaub, Wohnung & Versicherungen). Nach
Gehaltseingang wird direkt auf die richtigen Konten verteilt (kein Zwischenlagern).

## Die zwei wichtigsten Auswertungen
1. **Kosten je Konto** – pro Konto die monatlichen Fixkosten + Abos, und bei den
   gemeinsamen Konten ein **Deckungs-Check** (Bedarf vs. eingeplante Verteilung).
2. **Kosten je Person / Monat** – private Kosten + monatliche Verteilung auf die
   gemeinsamen Konten = Gesamtkosten je Person, gegen das Einkommen → Überschuss.

## Features
- **Übersicht:** KPIs (Einnahmen, Fixkosten & Abos, Überschuss), Karten „Kosten je Konto"
  mit Deckungs-Badge und Tabelle „Kosten je Person".
- **Kosten & Abos:** filterbare Tabelle aller Posten (nach Konto, Kategorie, Art =
  Fixkosten/Abo), normalisierte Monatskosten (jährlich ÷ 12, vierteljährlich ÷ 3) und
  inline editierbare Kategorie-Tags.
- **Zahlungslauf:** je gemeinsamem Konto ein Timing-Check – kommt die Verteilung früh
  genug an, bevor die Buchungen abgehen? Inkl. nötigem Mindest-Puffer.
- **Analyse:** Donut (Kosten je Kategorie), Balken (Einkommen vs. Kosten je Person) und
  Balken (Kosten je Konto, aufgeteilt nach Fixkosten/Abos).
- **Kategorien:** vordefinierte Kategorien, Auto-Zuordnung per Schlüsselwort, manuelle
  Overrides (in `localStorage`).
- **Meine Daten:** Konten, Einnahmen, Fixkosten/Abos und die Verteilung direkt in der App
  pflegen – **nur im Browser** gespeichert, nichts wird hochgeladen.
- **Export für Claude:** ein Klick erzeugt eine analyse-fertige JSON (inkl. Kosten je
  Konto, Deckung, Kosten je Person) für eine Auswertung durch Claude.

## Schnellstart
```bash
npm install
npm run dev
```
Die App öffnet auf <http://localhost:5173> und startet sofort mit Demo-Daten
(6 Konten, Beispiel-Einnahmen, -Fixkosten, -Abos und -Verteilung).

## Eigene Daten eintragen
Alles läuft über die Seite **„Meine Daten"** – keine Einrichtung, keine Schlüssel:
1. **Konten:** Privat- und gemeinsame Konten anlegen/umbenennen/löschen. Bei Privatkonten
   den **Inhaber** (Person) eintragen – daraus entstehen die Personen in der Auswertung.
2. **Einnahmen:** je Gehalt/Einnahme Betrag, Rhythmus und Privatkonto.
3. **Fixkosten & Abos:** je Posten Betrag, Rhythmus, Konto, Kategorie und **Art**
   (Fixkosten oder Abo) sowie den Ausführungstag.
4. **Verteilung:** wer nach Gehalt wie viel von einem Privatkonto auf ein gemeinsames
   Konto bucht.

**Speichern** legt alles im `localStorage` deines Browsers ab. Die Eingaben überlagern die
Demo-Daten; „Auf Demo-Daten zurücksetzen" entfernt sie wieder.

> **Datenschutz:** Deine Zahlen verlassen dein Gerät nicht. Eine öffentlich gehostete
> Variante zeigt für andere Besucher weiterhin nur die Demo-Daten.

## Export für Claude
1. In der App auf **„Export für Claude"** (Seitenleiste) klicken.
2. Die heruntergeladene `privatefinance-export-<datum>.json` enthält Konten, Einnahmen,
   Fixkosten/Abos, die Kosten je Konto, die Deckung der gemeinsamen Konten und die Kosten
   je Person – inkl. eingebettetem `task`-Text (der Frage an Claude).
3. Lade die JSON in einen Claude-Chat und frage nach einer Auswertung (Deckung,
   Sparpotenzial bei Abos, faire Verteilung, Sparrate).

## MCP – Claude direkten Zugriff geben (optional)
Statt Export kann Claude die (Demo-)Daten über einen **MCP-Server** direkt abfragen:

- `list_accounts` – Konten
- `list_standing_orders` – Fixkosten/Abos inkl. Monatskosten (optional nach Art filtern)
- `costs_by_account` – Kosten je Konto + Deckung der gemeinsamen Konten
- `person_summary` – Kosten/Einkommen/Überschuss je Person
- `expenses_by_category` – Kosten je Kategorie
- `analyze_cashflow` – komplette analyse-fertige Struktur
- `payment_schedule` – Zahlungslauf/Timing je gemeinsamem Konto

**In Claude Code:** Das Repo enthält eine `.mcp.json`; beim Öffnen wird der Server
`privatefinance` angeboten. Manuell testen: `npm run mcp`.

> Hinweis: Der MCP-Server liest die Demo-Daten (`src/data/mockData.js`). Deine echten
> Eingaben liegen im Browser-localStorage – für deren Analyse den „Export für Claude" nutzen.

## Kategorien erweitern
Die Auto-Kategorisierung steckt in `src/lib/categories.js`:
- Neue Schlüsselwörter zu `KEYWORD_RULES` hinzufügen.
- Neue Kategorie? In `CATEGORIES` und `KEYWORD_RULES` ergänzen.

## Projektstruktur
```
src/
  data/        Demo-Daten (mockData) + Datenquelle
  lib/         recurring (Auswertungen), normalize, categories, storage, merge,
               selectors, timing, claudeExport
  components/  Sidebar, Karten, Kategorie-Tag, Charts
  pages/       Übersicht, Kosten & Abos, Zahlungslauf, Analyse, Kategorien, Meine Daten
mcp/
  finance-server.js   MCP-Server (Demo-Daten)
```

## Tech Stack
React + Vite · Chart.js / react-chartjs-2 · reines Frontend, kein Backend ·
`localStorage` für eigene Daten + Kategorie-Overrides · UI durchgehend auf Deutsch.
