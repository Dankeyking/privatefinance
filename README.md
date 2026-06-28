# PrivateFinance – Manuelles Haushalts-Finanztool

Ein schlankes Dashboard, um den Haushalt **manuell** im Blick zu behalten: ihr tragt
**Einnahmen, Fixkosten und Abos** selbst ein, legt pro Posten eine **Aufteilung** fest
(wer zahlt welchen Anteil) und das **Abbuchungskonto**. Daraus berechnet die App die
Kosten je Konto, die Kosten je Person und den Geldfluss zwischen den Konten – **ohne
Bankanbindung**, alles bleibt nur im Browser.

Das Modell passt zu mehreren Konten: **Privatkonten** (je Person) und mehrere
**gemeinsame Konten** (z. B. Gemeinschaft, Haushalt, Urlaub, Wohnung & Versicherungen).
Nach Gehaltseingang bucht jede Person ihren Anteil direkt auf die richtigen Konten.

## Aufteilung pro Posten
Jeder Fixkostenposten wird zwischen den Personen aufgeteilt:
- **Gleich (alle)** – 50/50 (Standard für gemeinsame Kosten)
- **Eine Person** – nur diese Person zahlt
- **Prozent** – frei gewählte Prozentsätze
- **Beträge €** – feste Beträge je Person (z. B. Miete: einer 720 €, der andere den Rest)

Jährliche/vierteljährliche Posten werden auf Monatsbasis umgerechnet (jährlich ÷ 12),
sodass pro Konto der **monatlich aufs Konto zu buchende Betrag** herauskommt.

## Die wichtigsten Auswertungen (Übersicht)
1. **Geldfluss zwischen den Konten** – wer überweist wie viel auf welches Konto
   (Fluss-Diagramm + „von → nach"-Tabelle), abgeleitet aus den Aufteilungen.
2. **Kosten je Konto** – pro Konto der monatlich zu buchende Betrag (inkl. Rücklage für
   jährliche/vierteljährliche Posten) und der Jahreswert.
3. **Kosten je Person / Monat** – Summe der Anteile jeder Person, gegen das Einkommen → Überschuss.

## Features
- **Übersicht:** KPIs, Geldfluss-Diagramm, Kosten je Konto und Kosten je Person.
- **Kosten & Abos:** filterbare Tabelle aller Posten (nach Konto, Kategorie, Art =
  Fixkosten/Abo), normalisierte Monatskosten und die Aufteilung je Person.
- **Analyse:** Donut (Kosten je Kategorie), Balken (Einkommen vs. Kosten je Person,
  Kosten je Konto).
- **Kategorien:** vordefinierte Kategorien, Auto-Zuordnung per Schlüsselwort, manuelle
  Overrides (in `localStorage`).
- **Meine Daten:** Konten, Einnahmen und Fixkosten/Abos inkl. Aufteilung pflegen – **nur
  im Browser** gespeichert, nichts wird hochgeladen.
- **Export für Claude:** ein Klick erzeugt eine analyse-fertige JSON (Kosten je Konto,
  Kosten je Person, Geldfluss) für eine Auswertung durch Claude.

## Schnellstart
```bash
npm install
npm run dev
```
Die App öffnet auf <http://localhost:5173> und startet mit Beispiel-Daten.

## Eigene Daten eintragen
Alles läuft über die Seite **„Meine Daten"** – keine Einrichtung, keine Schlüssel:
1. **Konten:** Privat- und gemeinsame Konten anlegen/umbenennen/löschen. Bei Privatkonten
   den **Inhaber** (Person) eintragen – daraus entstehen die Personen in der Auswertung.
2. **Einnahmen:** je Gehalt/Einnahme Betrag, Rhythmus und Privatkonto.
3. **Fixkosten & Abos:** je Posten Betrag, Rhythmus, **Konto** (Abbuchung), Kategorie,
   Art (Fixkosten/Abo), Ausführungstag und die **Aufteilung** (Gleich / Eine Person /
   Prozent / Beträge €).

**Speichern** legt alles im `localStorage` deines Browsers ab und überlagert die
Beispiel-Daten. „Auf Startdaten zurücksetzen" entfernt sie wieder.

> **Datenschutz:** Deine Zahlen verlassen dein Gerät nicht. Eine öffentlich gehostete
> Variante zeigt für andere Besucher weiterhin nur die Start-/Beispieldaten aus dem Code.

## Export für Claude
1. In der App auf **„Export für Claude"** (Seitenleiste) klicken.
2. Die `privatefinance-export-<datum>.json` enthält Konten, Einnahmen, Fixkosten/Abos
   (inkl. Aufteilung), Kosten je Konto, Kosten je Person und den Geldfluss – plus
   eingebetteten `task`-Text (die Frage an Claude).
3. Lade die JSON in einen Claude-Chat und frag nach einer Auswertung (Sparpotenzial bei
   Abos, faire Aufteilung, Sparrate).

## MCP – Claude direkten Zugriff geben (optional)
Statt Export kann Claude die Beispiel-Daten über einen **MCP-Server** abfragen:

- `list_accounts` – Konten
- `list_standing_orders` – Fixkosten/Abos inkl. Monatskosten und Aufteilung
- `costs_by_account` – Kosten je Konto (monatlich/jährlich, Rücklage-Anteil)
- `person_summary` – Kosten/Einkommen/Überschuss je Person
- `expenses_by_category` – Kosten je Kategorie
- `analyze_cashflow` – komplette analyse-fertige Struktur

**In Claude Code:** Das Repo enthält eine `.mcp.json`; beim Öffnen wird der Server
`privatefinance` angeboten. Manuell testen: `npm run mcp`.

> Hinweis: Der MCP-Server liest die Beispiel-Daten (`src/data/mockData.js`). Deine echten
> Eingaben liegen im Browser-localStorage – für deren Analyse den „Export für Claude" nutzen.

## Kategorien erweitern
Die Auto-Kategorisierung steckt in `src/lib/categories.js` (`KEYWORD_RULES` / `CATEGORIES`).

## Projektstruktur
```
src/
  data/        Start-/Beispieldaten (mockData) + Datenquelle
  lib/         recurring (Auswertungen, Aufteilung, Flüsse), normalize, categories,
               storage, merge, selectors, claudeExport
  components/  Sidebar, Karten, Kategorie-Tag, Charts
  pages/       Übersicht, Kosten & Abos, Analyse, Kategorien, Meine Daten
mcp/
  finance-server.js   MCP-Server (Beispiel-Daten)
```

## Tech Stack
React + Vite · Chart.js / react-chartjs-2 · reines Frontend, kein Backend ·
`localStorage` für eigene Daten + Kategorie-Overrides · UI durchgehend auf Deutsch.
