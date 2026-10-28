// =============================================================================
//  kontrast.mjs — prüft die Farbpaletten gegen WCAG 2.1
// =============================================================================
//  Aufruf: npm run kontrast   (bricht mit Code 1 ab, wenn etwas durchfällt)
//
//  Geprüft wird nicht die Absicht, sondern das, was applyPalette() tatsächlich
//  setzt: jeder Wert, der im Projekt als Text auf einer Fläche steht, gegen
//  jede Fläche, auf der er stehen kann — Karte, Seitenhintergrund, dezente
//  Fläche, Chip, Pille, Seitenleiste.
//
//  Zwei verschiedene Latten:
//    Text           4,5:1  (WCAG AA, normale Schriftgröße)
//    Flächen        3:1    (Kontofarben und Kategorien sind Balken und
//                          Kacheln, kein Text — sie müssen sich nur abheben)
//
//  Es gibt keine Ausnahme: auch „standard“ muss bestehen. Die Palette lag
//  früher an 22 Stellen darunter (`--pos` 3,30:1 auf Weiß); das ist mit
//  derselben Methode nachgezogen worden wie bei den anderen — Helligkeit
//  verschoben, Farbton und Sättigung behalten.
// =============================================================================

import { readFile } from 'node:fs/promises'
import { PALETTES, applyPalette, tokens, readableOn, tintOn, legibleOn } from '../src/lib/palettes.js'

// --- Minimaler DOM-Ersatz: applyPalette schreibt in document.documentElement.
const gesetzt = {}
globalThis.document = {
  documentElement: {
    style: {
      setProperty(k, v) { gesetzt[k] = v },
      removeProperty(k) { delete gesetzt[k] },
    },
  },
}

// Die Standard-Palette bringt keine eigenen Flächen- und Textwerte mit
// (`ui: null`), die stehen in index.css. Die werden hier GELESEN, nicht
// abgeschrieben: eine zweite Liste derselben Werte wäre schon beim ersten
// Nachziehen veraltet — und das Skript hätte dann das Falsche geprüft.
const CSS = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

function varsAus(selektor) {
  const start = CSS.indexOf(selektor)
  if (start < 0) throw new Error(`${selektor} nicht in index.css gefunden`)
  const block = CSS.slice(start, CSS.indexOf('\n}', start))
  const map = {}
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim()
  return map
}

const AUS_CSS = { light: varsAus(':root {'), dark: varsAus("[data-theme='dark'] {") }

// Eine halbdurchsichtige Tönung auf ihrer Unterlage zusammenrechnen — so wie
// der Browser es tut. Ohne das ließe sich auf den Chips im dunklen Design
// nichts rechnen, da stehen die Flächen als rgba().
function deckend(wert, unterlage) {
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(wert || '')
  if (!m) return wert
  const a = m[4] === undefined ? 1 : Number(m[4])
  const u = hexToRgb(unterlage)
  const misch = [1, 2, 3].map((i) => Math.round(Number(m[i]) * a + u[i - 1] * (1 - a)))
  return '#' + misch.map((v) => v.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex) {
  const roh = String(hex).trim().replace('#', '')
  const h = roh.length === 3 ? roh.split('').map((c) => c + c).join('') : roh
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

function leuchtdichte(hex) {
  const kanal = (v255) => {
    const v = v255 / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b)
}

function kontrast(a, b) {
  const la = leuchtdichte(a)
  const lb = leuchtdichte(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const z2 = (n) => n.toFixed(2)
const ZIEL_TEXT = 4.5
const ZIEL_FLAECHE = 3

let durchgefallen = 0
const tabelle = []

for (const p of PALETTES) {
  for (const modus of ['light', 'dark']) {
    for (const k of Object.keys(gesetzt)) delete gesetzt[k]
    applyPalette(p.id, modus)
    const t = tokens()
    const roh = (name) => gesetzt[name] || AUS_CSS[modus][name]
    const karte = roh('--card-bg')
    const v = (name) => deckend(roh(name), karte)
    const flaechen = [['Karte', v('--card-bg')], ['Seite', v('--content-bg')], ['Fläche', v('--surface-2')]]

    const paare = []
    const aufAllen = (name, farbe) => {
      for (const [wie, bg] of flaechen) paare.push([`${name} auf ${wie}`, farbe, bg])
    }
    aufAllen('--text', v('--text'))
    aufAllen('--text-muted', v('--text-muted'))
    aufAllen('--pos', t.pos)
    aufAllen('--neg', t.neg)
    aufAllen('--warn', t.warn)
    aufAllen('--info', t.info)
    aufAllen('--accent', v('--accent'))
    aufAllen('--accent-2', v('--accent-2'))
    for (const n of ['pos', 'neg']) {
      paare.push([`--chip-${n}-fg auf -bg`, v(`--chip-${n}-fg`), v(`--chip-${n}-bg`)])
    }
    for (const n of ['fix', 'sub', 'umb', 'ended']) {
      paare.push([`--pill-${n}-fg auf -bg`, v(`--pill-${n}-fg`), v(`--pill-${n}-bg`)])
    }
    paare.push(['--sidebar-text auf Seitenleiste', v('--sidebar-text'), v('--sidebar-bg')])
    paare.push(['--on-dark auf Seitenleiste', v('--on-dark'), v('--sidebar-bg')])
    paare.push(['--sidebar-accent auf Seitenleiste', v('--sidebar-accent'), v('--sidebar-bg')])
    paare.push(['--chart-tick auf Karte', t.chart.tick, v('--card-bg')])
    // Die Blockkacheln der Treemap („Kosten" / „Sparen"): getönte Flächen mit
    // einer Überschrift darauf. Beides wird gerechnet, nicht gesetzt — also
    // auch hier nachprüfen.
    const bgSav = tintOn(t.cat.Sparen, v('--card-bg'), 0.2)
    const bgCost = tintOn(t.chart.tick, v('--card-bg'), 0.16)
    paare.push(['Treemap-Block „Sparen" Überschrift', legibleOn(t.cat.Sparen, bgSav), bgSav])
    paare.push(['Treemap-Block „Kosten" Überschrift', legibleOn(t.chart.tick, bgCost), bgCost])

    const melde = (text) => {
      durchgefallen++
      console.log(`DURCHGEFALLEN  ${p.id}/${modus}  ${text}`)
    }

    let schwaechster = Infinity
    let wo = ''
    for (const [name, farbe, bg] of paare) {
      const r = kontrast(farbe, bg)
      if (r < schwaechster) { schwaechster = r; wo = name }
      if (r < ZIEL_TEXT) melde(`${name}: ${farbe} auf ${bg} = ${z2(r)}:1`)
    }

    // Kontofarben und Kategorien: Flächen, auf denen Schrift stehen kann
    // (Treemap-Kachel, Kategorie-Tag). readableOn wählt hell oder dunkel.
    const datenfarben = [...t.series, ...Object.values(t.cat)]
    const kachelschrift = Math.min(...datenfarben.map((c) => kontrast(readableOn(c), c)))
    const abhebung = Math.min(...datenfarben.map((c) => kontrast(c, v('--card-bg'))))
    if (abhebung < ZIEL_FLAECHE) melde(`Datenfarbe hebt sich nicht von der Karte ab: ${z2(abhebung)}:1`)
    // Die Hero-Kachel liegt in --sidebar-bg auf --content-bg. Sind beide
    // derselbe Wert, ist sie schlicht nicht zu sehen.
    const heroKante = kontrast(v('--sidebar-bg'), v('--content-bg'))
    if (heroKante < 1.01) melde(`Hero-Kachel hat dieselbe Farbe wie die Seite (${z2(heroKante)}:1)`)
    // Die Blockkacheln müssen sich von der Karte abheben, sonst ist die
    // Gruppierung nicht zu sehen.
    for (const [wie, bg] of [['Sparen', bgSav], ['Kosten', bgCost]]) {
      const k = kontrast(bg, v('--card-bg'))
      if (k < 1.06) melde(`Treemap-Block „${wie}" hebt sich kaum von der Karte ab (${z2(k)}:1)`)
    }

    tabelle.push({
      Palette: p.label,
      Modus: modus === 'light' ? 'hell' : 'dunkel',
      'Text min': `${z2(schwaechster)}:1`,
      'schwächster Wert': wo,
      'Kachelschrift min': `${z2(kachelschrift)}:1`,
      'Datenfarbe min': `${z2(abhebung)}:1`,
    })
  }
}

console.table(tabelle)

console.log('')
if (durchgefallen === 0) {
  console.log(`Alle Paletten erreichen ${ZIEL_TEXT}:1 für Text und ${ZIEL_FLAECHE}:1 für Flächen.`)
} else {
  console.log(`${durchgefallen} Prüfungen durchgefallen.`)
}
process.exit(durchgefallen === 0 ? 0 : 1)
