# PrivateFinance – Manuelles Haushalts-Finanztool

Ein schlankes Dashboard, um den Haushalt **manuell** im Blick zu behalten: ihr tragt
**Einnahmen, Fixkosten und Abos** selbst ein, legt pro Posten eine **Aufteilung** fest
(wer zahlt welchen Anteil) und das **Abbuchungskonto**. Daraus berechnet die App die
Kosten je Konto, die Kosten je Person und den Geldfluss zwischen den Konten – **ohne
Bankanbindung**.

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
- **Konten:** Kontostände, Monatslast je Konto und **Sparziele** mit Fortschrittsbalken.
- **Analyse:** Donut (Kosten je Kategorie), **Kosten-Treemap**, **Abo-Radar** (Abos nach
  €/Jahr), Balken (Einkommen vs. Ausgaben je Person, Kosten je Konto).
- **Responsiv:** funktioniert am Handy – Tabellen werden zu übersichtlichen Karten.
- **Kategorien:** vordefinierte Kategorien, Auto-Zuordnung per Schlüsselwort, manuelle
  Overrides und eigene Kategorien.
- **CSV-Import:** Bank-Umsätze (CSV-Export) einlesen – die App erkennt Trennzeichen und
  Spalten automatisch, findet **wiederkehrende Zahlungen** und schlägt sie als
  Fixkosten/Abos vor (Konto & Aufteilung wählst du, dann übernehmen).
- **Meine Daten:** Konten, Einnahmen und Fixkosten/Abos inkl. Aufteilung pflegen.
- **Export für Claude:** ein Klick erzeugt eine analyse-fertige JSON (Kosten je Konto,
  Kosten je Person, Geldfluss) für eine Auswertung durch Claude.
- **MCP-Server:** Claude kann die Daten direkt lesen **und ändern** – siehe
  [MCP – Claude direkten Zugriff geben](#mcp--claude-direkten-zugriff-geben).

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

Gespeichert wird serverseitig in Postgres (`prisma/schema.prisma`), getrennt je
Authentik-Nutzer: Duncan und Elisa teilen die Gruppe `familie`, jeder andere Nutzer
bekommt seine eigene, isolierte Gruppe. „Auf Startdaten zurücksetzen" leert sie wieder.

> **Datenschutz:** Die Daten liegen in der eigenen Postgres-Instanz hinter
> Authentik-SSO – nicht bei Dritten. Die Startdaten in `mockData.js` sind bewusst
> im Repo sichtbar; sie sind nur die Basis für ein leeres Profil.

## Export für Claude
1. In der App auf **„Export für Claude"** (Seitenleiste) klicken.
2. Die `privatefinance-export-<datum>.json` enthält Konten, Einnahmen, Fixkosten/Abos
   (inkl. Aufteilung), Kosten je Konto, Kosten je Person und den Geldfluss – plus
   eingebetteten `task`-Text (die Frage an Claude).
3. Lade die JSON in einen Claude-Chat und frag nach einer Auswertung (Sparpotenzial bei
   Abos, faire Aufteilung, Sparrate).

## MCP – Claude direkten Zugriff geben
`mcp/finance-server.js` stellt die Daten der **laufenden Instanz** als MCP-Tools bereit –
lesen **und schreiben**. Damit korrigiert Claude Beträge, Abbuchungskonten oder
Aufteilungen direkt, statt dass du jede Änderung in der Oberfläche klickst (praktisch beim
Abgleich mit Kontoauszügen). Die Auswertungen rechnet der MCP-Server mit denselben
Funktionen wie die Oberfläche (`src/lib`), die Zahlen stimmen also überein.

### Tools
**Lesen**

| Tool | Zweck |
| --- | --- |
| `list_accounts` | Konten mit Id, Inhaber, Typ, Saldo |
| `list_standing_orders` | Fixkosten/Abos inkl. Monatskosten; Filter `kind`, `accountId`, `search`, `includeEnded` |
| `list_incomes` / `list_transfers` / `list_debts` | Einnahmen / Umbuchungen / Schulden |
| `analyze_cashflow` | komplette analyse-fertige Struktur (wie „Export für Claude") |
| `costs_by_account` | Kosten je Konto (monatlich/jährlich, Rücklage-Anteil) |
| `person_summary` | Kosten/Sparen/Einkommen/Überschuss je Person |
| `expenses_by_category` | Kosten je Kategorie |
| `upcoming_payments` | demnächst fällige Posten (`days`, Default 30) |

**Schreiben** – je Sammlung `create_*`, `update_*`, `delete_*`:
`account`, `income`, `standing_order`, `transfer`, `debt`.
`update_*` ändert nur die übergebenen Felder, alles andere bleibt stehen. Beim Anlegen
genügen die Pflichtfelder (z. B. `recipient`, `amount`, `accountId`) – Kategorie
(Schlüsselwort-Automatik), `kind`, `executionDay`, `split` und die abgeleiteten Felder
`monthInterval`/`nextExecution` setzt der Server.

### 1. Token auf dem Server setzen
Die API hängt hinter Authentik, ein MCP-Server hat aber keinen Browser und kein
SSO-Cookie. Er weist sich deshalb mit einem **Token** aus, das die App selbst prüft –
als Header `X-Api-Key: <token>` oder `Authorization: Bearer <token>`.

Token erzeugen und am Container als Umgebungsvariable setzen (**nicht** ins Repo):

```bash
openssl rand -base64 32
```

| Variable | Bedeutung |
| --- | --- |
| `FINANCE_API_TOKEN` | Das Token. **Nicht gesetzt = Token-Zugang komplett aus** (Default). |
| `FINANCE_API_USER` | Als welcher Authentik-Nutzer das Token handelt. Default `wesseler` → Gruppe `familie`. |
| `FINANCE_TRUSTED_PROXIES` | Optional, empfohlen: Komma-Liste der IPs, von denen `x-authentik-username` akzeptiert wird (die des Authentik-Outposts). Leer = jede IP, wie bisher. |

> **Warum `FINANCE_TRUSTED_PROXIES` sinnvoll ist:** der Container läuft im Docker-Netzmodus
> `host` und ist damit auch direkt auf Port 8080 im LAN/Tailnet erreichbar – also an
> Authentik vorbei. Ohne die Variable würde dort jeder, der den Header
> `x-authentik-username: wesseler` selbst setzt, die Haushaltsdaten bekommen. Mit der
> Variable zählt auf direkten Verbindungen nur noch das Token.

### 2. Welche URL der MCP-Server anspricht
Zwei Wege, je nachdem, wo Claude Code läuft:

**A – direkt an den Container (empfohlen, wenn erreichbar).** Wegen Netzmodus `host`
hört die App auf Port 8080 des Docker-Hosts; Authentik sitzt davor, nicht dazwischen.

```
FINANCE_API_URL=http://apps:8080/api
```

**B – über den Reverse Proxy.** Dann muss der Pfad `/token-api` in den
**Unauthenticated Paths** des Authentik-Proxy-Providers stehen (Regex `^/token-api/`).
`/token-api` trägt dieselben Routen wie `/api`, ignoriert dort aber bewusst jeden
mitgesendeten `x-authentik-username`-Header – es zählt nur das Token. Die Oberfläche
(unter `/api`) bleibt davon unberührt und weiterhin durch Authentik geschützt.

```
FINANCE_API_URL=https://finance.wesseler.uk/token-api
```

Zeigt `FINANCE_API_URL` versehentlich auf einen durch Authentik geschützten Pfad,
antwortet der MCP-Server mit einem erklärenden Fehler (Redirect zum Login) statt mit
einem stillen Fehlschlag.

### 3. In Claude Code eintragen (`.mcp.json`)
Das Repo enthält eine `.mcp.json`; sie liest die Konfiguration aus der Umgebung, damit
kein Token im Repo landet:

```json
{
  "mcpServers": {
    "privatefinance": {
      "command": "node",
      "args": ["mcp/finance-server.js"],
      "env": {
        "FINANCE_API_URL": "${FINANCE_API_URL:-http://apps:8080/api}",
        "FINANCE_API_TOKEN": "${FINANCE_API_TOKEN}"
      }
    }
  }
}
```

`FINANCE_API_URL` und `FINANCE_API_TOKEN` also in der Shell setzen, aus der Claude Code
startet (bzw. dauerhaft als Benutzer-Umgebungsvariablen). Danach `/mcp` in Claude Code –
der Server `privatefinance` muss als *connected* erscheinen.

Schnelltest ohne Claude:

```bash
FINANCE_API_URL=http://apps:8080/api FINANCE_API_TOKEN=<token> npm run mcp
```

Der Server schreibt seine API-URL nach stderr und wartet dann auf stdio.

### Lokal entwickeln
Ohne Authentik und ohne Token: Server mit `DEV_USER` starten, der MCP-Server zeigt
auf `localhost`.

```bash
DEV_USER=wesseler npm run server      # :8080, nutzt DATABASE_URL
FINANCE_API_URL=http://localhost:8080/api npm run mcp
```

### Hinweis zum Parallelbetrieb
Eine **offene Oberfläche** hält ihren Stand im Browser und speichert ganze Listen
(`PUT /api/manual`). Änderst du parallel per MCP, zeigt der offene Tab den alten Stand –
und ein Speichern dort kann die MCP-Änderung überschreiben. Also: Tab neu laden,
nachdem Claude etwas geändert hat.

## Kategorien erweitern
Die Auto-Kategorisierung steckt in `src/lib/categories.js` (`KEYWORD_RULES` / `CATEGORIES`).

## Projektstruktur
```
src/
  data/        Start-/Beispieldaten (mockData) + Datenquelle
  lib/         recurring (Auswertungen, Aufteilung, Flüsse), normalize, categories,
               storage, merge, selectors, claudeExport
  components/  Sidebar, Karten, Kategorie-Tag, Charts
  pages/       Übersicht, Kosten & Abos, CSV-Import, Analyse, Kategorien, Meine Daten
server/
  index.js            Express-API + Auslieferung des Builds; Auth über Authentik-Header
                      oder Token; granulare Routen /api/items/<sammlung>
prisma/
  schema.prisma       Postgres-Modelle (Account, Income, StandingOrder, Transfer,
                      CategoryOverride, Debt, Category) – je Gruppe (groupId)
mcp/
  finance-server.js   MCP-Server gegen die HTTP-API (lesen + schreiben)
```

## Tech Stack
React + Vite · Chart.js / react-chartjs-2 · Express + Prisma/Postgres ·
Authentik-SSO davor · MCP-Server (`@modelcontextprotocol/sdk`) für Claude ·
UI durchgehend auf Deutsch.
