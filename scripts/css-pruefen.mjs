// Prueft src/index.css auf einen Fehler, den weder Vite noch der Browser meldet:
// eine @media-Regel, deren schliessende Klammer fehlt.
//
// Das ist in dieser Datei schon einmal passiert. Die geschluckten 195 Zeilen
// enthielten das ganze Handy-Layout; der Build lief durch, weil eine
// ueberzaehlige Klammer am Dateiende die Bilanz wieder ausglich. CSS-seitig war
// alles gueltig - nur stand das halbe Stylesheet jetzt in
// @media (prefers-reduced-motion: reduce) und galt praktisch nie.
//
// Verlaesslich erkennbar ist das an der Verschachtelung: in dieser handgeschriebenen
// Datei steht nie ein @media in einem @media. Taucht das auf, hat eine Klammer gefehlt.
import postcss from 'postcss'
import { readFile } from 'node:fs/promises'

const DATEI = process.argv[2] || 'src/index.css'
const quelle = await readFile(DATEI, 'utf8')

let wurzel
try {
  wurzel = postcss.parse(quelle, { from: DATEI })
} catch (e) {
  console.error(`${DATEI}: CSS laesst sich nicht lesen - ${e.message}`)
  process.exit(1)
}

const fehler = []

wurzel.walkAtRules((regel) => {
  if (!['media', 'supports', 'container'].includes(regel.name)) return
  regel.walkAtRules((innen) => {
    if (!['media', 'supports', 'container'].includes(innen.name)) return
    fehler.push(
      `Zeile ${innen.source.start.line}: @${innen.name} ${innen.params} steht in ` +
        `@${regel.name} ${regel.params} (Zeile ${regel.source.start.line}). ` +
        `Fehlt der aeusseren Regel die schliessende Klammer?`,
    )
  })
})

// Zweiter Fall: ueberzaehlige Klammer, die postcss nicht stoert, aber ein
// Zeichen dafuer ist, dass oben etwas offen geblieben ist.
let tiefe = 0
let minimum = 0
for (const z of quelle) {
  if (z === '{') tiefe += 1
  else if (z === '}') { tiefe -= 1; minimum = Math.min(minimum, tiefe) }
}
if (minimum < 0) fehler.push('Es gibt eine schliessende Klammer ohne oeffnende.')
if (tiefe > 0) fehler.push(`${tiefe} Block(e) sind nicht geschlossen.`)

if (fehler.length) {
  console.error(`${DATEI}: ${fehler.length} Problem(e)`)
  fehler.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}

const regeln = []
wurzel.walkRules(() => regeln.push(1))
console.log(`${DATEI}: in Ordnung (${regeln.length} Regeln, keine verschachtelten @media).`)
