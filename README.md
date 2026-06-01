# PrivateFinance – Haushalts-Cashflow-Dashboard

Ein schlankes Dashboard zur Verwaltung des Haushalts-Cashflows über mehrere
**C24-Bank-Konten** (ein Gemeinschaftskonto + zwei Privatkonten). Die Gehälter gehen
auf die Privatkonten; von dort wird ein Beitrag aufs Gemeinschaftskonto überwiesen,
das die gemeinsamen Fixkosten zahlt. Einzelne Kosten werden teils noch direkt vom
Privatkonto gezahlt – die App hilft, diese aufs Gemeinschaftskonto umzustellen.

Die App läuft **sofort mit Demo-/Mock-Daten** – ganz ohne API-Schlüssel. Echte
Daten holst du später über die [Enable Banking Account Information API](https://enablebanking.com/accounts-api/)
(kostenlos für die private Nutzung).

## Features

- **Übersicht:** KPI-Karten (Gesamtsaldo, Einnahmen, Ausgaben, Überschuss),
  Konto-Karten mit Farbcodierung und ein Geldfluss-Diagramm.
- **Daueraufträge:** Tabelle mit Empfänger, Betrag, Rhythmus, nächster Ausführung,
  Konto und Kategorie. Filter nach Konto/Kategorie, normalisierte Monatskosten
  (jährlich ÷ 12, vierteljährlich ÷ 3) und **inline editierbare Kategorie-Tags**.
  Aufträge, die noch übers Privatkonto laufen, sind farblich markiert.
- **Zahlungslauf:** Timing-Check der Kette Privatkonto → Beitrag → Gemeinschaftskonto
  → Lastschrift/Dauerauftrag. Zeigt chronologisch, ob das Geld rechtzeitig da ist,
  bevor die Buchungen abgehen, und welchen Mindest-Puffer das Gemeinschaftskonto braucht.
- **Analyse:** animierte Charts (Chart.js) – Balken (Einnahmen vs. Ausgaben),
  Donut (Ausgaben je Kategorie, mit Klick-Drilldown) und Saldoverlauf-Linie inkl. Prognose.
- **Kategorien:** vordefinierte Kategorien, Auto-Zuordnung per Schlüsselwort,
  manuelle Overrides (in `localStorage` gespeichert).
- **Meine Daten:** Konten, Daueraufträge und Beiträge (inkl. Ausführungstage) direkt
  in der App pflegen. Wird **nur im Browser** gespeichert (localStorage) und über die
  Bank-/Mock-Daten gelegt – nichts wird hochgeladen. So nutzt du auch die
  öffentliche Seite mit echten Zahlen, ohne dass jemand sie sieht.
- **Export für Claude:** ein Klick erzeugt eine analyse-fertige JSON – inkl.
  Markierung, welche Daueraufträge noch übers Privatkonto laufen. Diese Datei
  kannst du Claude geben, um eine Empfehlung zur Umstellung aufs
  Gemeinschaftskonto zu bekommen.

## Schnellstart (Mock-Daten)

```bash
npm install
npm run dev
```

Die App öffnet auf <http://localhost:5173>. Solange keine echten Daten vorhanden
sind, wird automatisch der Demo-Datensatz genutzt (Badge „Demo-/Mock-Daten“ in der
Seitenleiste).

## Echte C24-Konten verbinden (Schritt für Schritt)

> **Warum Enable Banking?** GoCardless / Nordigen hat die kostenlose Neuregistrierung
> für „Bank Account Data" eingestellt. [Enable Banking](https://enablebanking.com/)
> bietet denselben PSD2-Zugang (Salden + Umsätze lesen) **kostenlos für die private
> Nutzung** und unterstützt deutsche Banken inkl. C24.

> **Hinweis zu CORS:** Die Enable-Banking-API erlaubt **keine** direkten Aufrufe aus
> dem Browser. Deshalb holt das kleine Node-Skript `scripts/fetch-data.js` die Daten
> und legt sie als `public/data.json` ab – die App lädt diese Datei dann automatisch.

### Schritt 1 – Enable-Banking-Anwendung anlegen
1. Registriere dich unter <https://enablebanking.com/> und lege im Control Panel eine
   **Application** an (Typ „personal" genügt).
2. Hinterlege als **Redirect-URL** exakt
   `https://dankeyking.github.io/privatefinance/` (oder eine eigene, die du dann auch
   in `.env` setzt).
3. Beim Anlegen lädt dein Browser einen **privaten Schlüssel (.pem)** herunter – der
   Dateiname ist deine App-ID. Lege die Datei in den Projektordner.
4. Kopiere `.env.example` → `.env` und trage App-ID und Schlüsselpfad ein:
   ```bash
   cp .env.example .env
   ```
   ```ini
   ENABLEBANKING_APP_ID=...
   ENABLEBANKING_KEY_PATH=./aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.pem
   ```

### Schritt 2 – Konto-Konfiguration
1. Kopiere `config.example.js` → `config.js` (ist in `.gitignore`):
   ```bash
   cp config.example.js config.js
   ```
2. Die `enableBankingAccountUid` je Konto trägst du nach Schritt 3 ein.

### Schritt 3 – C24 verknüpfen (Session)
1. **Bank finden** (C24, Land DE):
   ```bash
   npm run eb-setup aspsps
   ```
   → zeigt den exakten Bank-Namen.
2. **Autorisierung starten** mit diesem Namen:
   ```bash
   npm run eb-setup link "C24 Bank"
   ```
   → gibt einen Login-Link aus. Im Browser öffnen, bei C24 einloggen und den Zugriff
   bestätigen. Danach landest du auf der Redirect-URL mit `?code=…` in der Adresszeile.
3. **Konto-UIDs abrufen** mit dem `code` aus der Adresszeile:
   ```bash
   npm run eb-setup session <code>
   ```
   → listet die verknüpften Konto-UIDs (+ IBANs). Trage diese in `config.js` als
   `enableBankingAccountUid` bei `joint` / `p1` / `p2` ein und setze jeweils den
   passenden `type` (`joint` oder `personal`).

### Schritt 4 – Daten holen & starten
```bash
npm run fetch-data   # holt Salden + Transaktionen -> public/data.json
npm run dev
```
Die Seitenleiste zeigt jetzt „Echte Daten”. Aktualisieren: einfach
`npm run fetch-data` erneut ausführen. (Der Zugriff gilt ~90 Tage; danach Schritt 3
wiederholen.)

### Schritt 5 – Daueraufträge & Beiträge ergänzen (wichtig)
Die Bank-API liefert **Salden + Umsätze, aber keine Daueraufträge und keine
Ausführungstage**. Diese – und die Haushaltsbeiträge (Privat → Gemeinschaft) – trägst
du unter **„Meine Daten”** in der App selbst ein. Erst damit funktionieren die Seiten
**Daueraufträge** und **Zahlungslauf** mit deinen echten Zahlen. Die Eingaben bleiben
nur in deinem Browser.

> **Datenschutz:** Die öffentliche GitHub-Pages-Seite enthält nie echte Daten –
> `public/data.json` ist in `.gitignore` und deine „Meine Daten”-Eingaben liegen nur
> im localStorage deines Browsers. Andere Besucher sehen weiterhin nur Demo-Daten.

## Export für Claude nutzen

1. In der App auf **„⬇︎ Export für Claude“** (Seitenleiste) klicken.
2. Die heruntergeladene `privatefinance-export-<datum>.json` enthält:
   - alle Daueraufträge inkl. normalisierter Monatskosten und Quellkonto-Typ,
   - `summary.ordersNotOnJoint`: die Kandidaten, die noch übers Privatkonto laufen,
   - einen eingebetteten `task`-Text (die Frage an Claude).
3. Lade die JSON in einen Claude-Chat hoch und frage nach der sinnvollsten
   Umstellungs-Reihenfolge aufs Gemeinschaftskonto.

## MCP – Claude direkten Zugriff geben (statt JSON-Export)

Statt jedes Mal die JSON zu exportieren, kann Claude die Daten über einen
**MCP-Server** direkt abfragen. Der Server liest dieselbe Datenquelle wie die App
(`public/data.json`, sonst Mock-Daten) und stellt Tools bereit:

- `list_accounts` – Konten + Salden
- `list_standing_orders` – Daueraufträge inkl. Monatskosten; `onlyPersonal: true`
  liefert nur die, die noch übers Privatkonto laufen (Umstell-Kandidaten)
- `analyze_cashflow` – komplette analyse-fertige Struktur (wie der JSON-Export)
- `expenses_by_category` – Ausgaben je Kategorie
- `payment_schedule` – Zahlungslauf/Timing: nötiger Puffer + ob alle Buchungen
  rechtzeitig durch die Beiträge gedeckt sind

**In Claude Code einbinden:** Das Repo enthält bereits eine `.mcp.json`. Beim Öffnen
des Projekts in Claude Code wird der Server `privatefinance` automatisch angeboten –
einmal bestätigen, fertig. Manuell testen:

```bash
npm run mcp
```

**In Claude Desktop einbinden:** in der Konfigurationsdatei
(`claude_desktop_config.json`) ergänzen und Pfad anpassen:

```json
{
  "mcpServers": {
    "privatefinance": {
      "command": "node",
      "args": ["/voller/pfad/zu/privatefinance/mcp/finance-server.js"]
    }
  }
}
```

Danach kannst du Claude einfach fragen: *„Welche Daueraufträge sollte ich aufs
Gemeinschaftskonto umstellen?"* – Claude ruft `analyze_cashflow` selbst auf.

## Kategorien erweitern

Die Auto-Kategorisierung steckt in `src/lib/categories.js`:
- Neue Schlüsselwörter zu `KEYWORD_RULES` hinzufügen.
- Neue Kategorie? In `CATEGORIES` und `KEYWORD_RULES` ergänzen.

## Projektstruktur

```
src/
  data/        Datenquelle (live vs. mock) + Mock-Generator
  lib/         Kategorien, Normalisierung, localStorage, Claude-Export, Selektoren
  components/  Sidebar, Karten, Flow-Diagramm, Kategorie-Tag, Charts
  pages/       Übersicht, Daueraufträge, Analyse, Kategorien
scripts/
  setup-enablebanking.js  Bank finden / verknüpfen / Konten auslesen
  fetch-data.js           Enable Banking -> public/data.json
```

## Tech Stack

React + Vite · Chart.js / react-chartjs-2 · reines Frontend, kein Backend ·
`localStorage` für Kategorie-Overrides · CSS-Variablen-Theming (dunkle Sidebar,
weißer Content). UI durchgehend auf Deutsch.
