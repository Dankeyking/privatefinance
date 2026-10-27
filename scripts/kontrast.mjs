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
//  Die Palette „standard“ ist der Stand von vor der Paletten-Auswahl und wird
//  bewusst nicht verändert. Sie erreicht an einigen Stellen keine 4,5:1; das
//  war vorher schon so. Darum wird sie nur berichtet und nicht gewertet — wer
//  sie eines Tages nachziehen will, findet die Liste unten im Bericht.
// =============================================================================

import { PALETTES, applyPalette, tokens, readableOn } from '../src/lib/palettes.js'

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

// Die Werte, die index.css für die Standard-Palette mitbringt (applyPalette
// überschreibt sie dort nicht). Dunkle Chip-Flächen sind dort rgba-Tönungen;
// hier stehen sie als deckende Mischung auf --card-bg, sonst ließe sich nicht
// rechnen.
const AUS_CSS = {
  light: {
    '--card-bg': '#ffffff', '--content-bg': '#f2f4fa', '--surface-2': '#eef1f8',
    '--text': '#0f172a', '--text-muted': '#64748b', '--accent': '#4c6ef5', '--accent-2': '#7c5cf0',
    '--sidebar-bg': '#0b1120', '--sidebar-text': '#aab8ce', '--sidebar-text-active': '#ffffff',
    '--chip-pos-fg': '#15803d', '--chip-neg-fg': '#b91c1c', '--pill-fix-fg': '#1d4ed8',
    '--pill-sub-fg': '#be185d', '--pill-umb-fg': '#4338ca', '--pill-ended-fg': '#64748b',
    '--chip-pos-bg': '#dcfce7', '--chip-neg-bg': '#fee2e2', '--pill-fix-bg': '#e0edff',
    '--pill-sub-bg': '#fce7f3', '--pill-umb-bg': '#e0e7ff', '--pill-ended-bg': '#f1f5f9',
    '--on-dark': '#ffffff', '--sidebar-accent': '#8da4ff',
  },
  dark: {
    '--card-bg': '#121c32', '--content-bg': '#0b1220', '--surface-2': '#1d2b48',
    '--text': '#e2e8f0', '--text-muted': '#90a4c0', '--accent': '#6d8bff', '--accent-2': '#9a7bff',
    '--sidebar-bg': '#090e1c', '--sidebar-text': '#9fb0c8', '--sidebar-text-active': '#ffffff',
    '--chip-pos-fg': '#6ee7b7', '--chip-neg-fg': '#fca5a5', '--pill-fix-fg': '#93c5fd',
    '--pill-sub-fg': '#f9a8d4', '--pill-umb-fg': '#a5b4fc', '--pill-ended-fg': '#94a3b8',
    '--chip-pos-bg': '#1b3443', '--chip-neg-bg': '#2a2437', '--pill-fix-bg': '#1a2742',
    '--pill-sub-bg': '#2c2342', '--pill-umb-bg': '#232a4b', '--pill-ended-bg': '#1e2639',
    '--on-dark': '#ffffff', '--sidebar-accent': '#8da4ff',
  },
}

function leuchtdichte(hex) {
  const roh = String(hex).trim().replace('#', '')
  const h = roh.length === 3 ? roh.split('').map((c) => c + c).join('') : roh
  const kanal = (paar) => {
    const v = parseInt(paar, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * kanal(h.slice(0, 2)) + 0.7152 * kanal(h.slice(2, 4)) + 0.0722 * kanal(h.slice(4, 6))
}

function kontrast(a, b) {
  const la = leuchtdichte(a)
  const lb = leuchtdichte(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const z2 = (n) => n.toFixed(2)
const ZIEL_TEXT = 4.5
const ZIEL_FLAECHE = 3
const STAND_VON_VORHER = 'standard'

let durchgefallen = 0
const altlasten = []
const tabelle = []

for (const p of PALETTES) {
  for (const modus of ['light', 'dark']) {
    for (const k of Object.keys(gesetzt)) delete gesetzt[k]
    applyPalette(p.id, modus)
    const t = tokens()
    const v = (name) => gesetzt[name] || AUS_CSS[modus][name]
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
    aufAllen('--savings', t.savings)
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

    const melde = (text) => {
      if (p.id === STAND_VON_VORHER) altlasten.push(`${p.id}/${modus}  ${text}`)
      else { durchgefallen++; console.log(`DURCHGEFALLEN  ${p.id}/${modus}  ${text}`) }
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

if (altlasten.length) {
  console.log('')
  console.log(`Standard-Palette — unverändert übernommen, ${altlasten.length} Stellen unter ${ZIEL_TEXT}:1:`)
  altlasten.forEach((z) => console.log(`  ${z}`))
}

console.log('')
if (durchgefallen === 0) {
  console.log(`Alle Paletten außer „standard“ erreichen überall ${ZIEL_TEXT}:1 für Text und ${ZIEL_FLAECHE}:1 für Flächen.`)
} else {
  console.log(`${durchgefallen} Prüfungen durchgefallen.`)
}
process.exit(durchgefallen === 0 ? 0 : 1)
