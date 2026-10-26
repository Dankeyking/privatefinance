# Vorschau-Instanz neben der Produktion

So läuft die Version vom Branch `redesign-v2` parallel zur laufenden App,
erreichbar im Browser, mit denselben echten Daten.

## 1. Image

Der Workflow baut seit dieser Änderung auch für `redesign-v2` und veröffentlicht

```
ghcr.io/dankeyking/privatefinance:redesign-v2
```

`:latest` bewegt weiterhin nur `main` — die Produktion kann also nicht
versehentlich überschrieben werden.

## 2. Compose-Dienst auf dem Host `apps`

In `/opt/apps/docker-compose.yml` neben den bestehenden Dienst:

```yaml
  privatefinance-v2:
    image: ghcr.io/dankeyking/privatefinance:redesign-v2
    restart: unless-stopped
    network_mode: host
    environment:
      # Dieselbe Datenbank wie die Produktion – siehe Hinweis unten.
      DATABASE_URL: "<derselbe Wert wie bei privatefinance>"
      PORT: "8081"
      FINANCE_TRUSTED_PROXIES: "127.0.0.1,::1"
```

Zwei Dinge daran sind wichtig:

- **`PORT: 8081`.** Der bestehende Dienst hört im Netzmodus `host` auf 8080;
  ohne eigenen Port kollidieren beide.
- **Kein eigenes `command`.** Der Startbefehl des Images führt `prisma db push`
  aus, und das wird hier gebraucht: Der Branch legt eine neue Tabelle an
  (`Preference`, die Reihenfolge der Abschnitte je Benutzer). Die Produktion
  kennt sie noch nicht, also muss die Vorschau sie anlegen. Der Zusatz ist rein
  additiv und rührt keine bestehende Tabelle an. Falls der Push unterbleibt,
  läuft die Vorschau trotzdem – dann lässt sich die Anordnung nur nicht
  speichern.

Starten:

```bash
cd /opt/apps && docker compose up -d privatefinance-v2
```

### Ohne die Datenbank-Adresse abzutippen

Wer den `DATABASE_URL`-Wert nicht aus dem bestehenden Dienst herauskopieren
will, startet die Vorschau stattdessen direkt und übernimmt die Variable aus
dem laufenden Container:

```bash
DB=$(docker inspect privatefinance -f '{{range .Config.Env}}{{println .}}{{end}}' | grep '^DATABASE_URL=')
docker run -d --name privatefinance-v2 --restart unless-stopped --network host   -e "$DB" -e PORT=8081 -e FINANCE_TRUSTED_PROXIES=127.0.0.1,::1   ghcr.io/dankeyking/privatefinance:redesign-v2
```

Der Container steht dann nicht in der Compose-Datei; abgeräumt wird er mit
`docker rm -f privatefinance-v2`.

## 3. Erreichbar machen

Der sicherste Weg ist, das Bestehende zu kopieren statt neu zu schreiben —
`finance.wesseler.uk` funktioniert ja:

1. **DNS:** Eintrag für `finance-v2.wesseler.uk` auf denselben Host wie
   `finance.wesseler.uk`.
2. **Traefik:** den vorhandenen Router samt Service für `finance.wesseler.uk`
   in der Datei-Konfiguration duplizieren. Im Duplikat ändern sich genau drei
   Dinge: die Schlüssel (`finance` → `finance-v2`), die Host-Regel auf
   `finance-v2.wesseler.uk` und die Ziel-URL auf `http://127.0.0.1:8081`.
   Cert-Resolver, Entrypoints und die Authentik-Middleware bleiben, wie sie
   sind.
3. **Authentik:** den Proxy-Provider von `finance.wesseler.uk` duplizieren,
   External Host auf `https://finance-v2.wesseler.uk` setzen, eine Anwendung
   damit verknüpfen und sie **demselben Outpost** zuweisen wie die bestehende.
   Der letzte Schritt wird gern vergessen; ohne ihn antwortet die neue Domain
   mit einem Authentik-Fehler statt mit der Anmeldung.

Prüfen, bevor die Domain steht: `curl -s -o /dev/null -w '%{http_code}
'
http://127.0.0.1:8081/` muss 200 liefern.

## Hinweis: beide Instanzen teilen eine Datenbank

Die Vorschau zeigt eure echten Daten — das ist der Zweck. Sie **schreibt**
aber auch in dieselbe Datenbank. Was du dort änderst, ist sofort in der
Produktion geändert; es ist keine Spielwiese.

Zum reinen Ansehen ist das in Ordnung. Willst du gefahrlos herumklicken,
leg stattdessen eine zweite Datenbank an (in `postgresql-apps` ein eigenes
Schema oder eine eigene Datenbank) und trag sie als `DATABASE_URL` ein; dann
startet die Vorschau leer und du spielst mit den Demo-Daten.

## Wieder abräumen

```bash
cd /opt/apps && docker compose stop privatefinance-v2 && docker compose rm -f privatefinance-v2
```

Danach den Compose-Block, den Traefik-Router und die Authentik-Anwendung
wieder entfernen.
