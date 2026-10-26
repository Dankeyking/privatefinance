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

## 3. Erreichbar machen

Genauso wie seinerzeit `finance.wesseler.uk`, nur auf Port 8081:

1. DNS-Eintrag für `finance-v2.wesseler.uk` auf denselben Host.
2. Traefik-Router in der Datei-Konfiguration, Ziel `http://127.0.0.1:8081`.
3. In Authentik eine Anwendung samt Proxy-Provider für die neue Domain,
   damit auch die Vorschau hinter eurer Anmeldung liegt.

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
