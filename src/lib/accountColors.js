// =============================================================================
//  accountColors.js — Farben je Konto (für Fluss, Karten, Tabellen)
// =============================================================================
//  Die acht Farben kommen aus der gewählten Palette (siehe palettes.js) und
//  wechseln mit ihr. Konten können eine eigene `color` tragen; sonst wird nach
//  Reihenfolge vergeben.
//
//  Zum Speichern: ein automatisch vergebener Platz liegt als `series-3` in der
//  Datenbank, nicht als Hex-Wert — nur so kann er der Palette folgen. Die
//  Spalte ist ein String, es braucht also keine Migration.
//
//  Konten, die vor den Paletten angelegt wurden, tragen einen festen Wert aus
//  der alten Liste (LEGACY_PALETTE). Ein solcher Wert gilt weiterhin als
//  „automatisch vergeben“ und folgt der Palette — sonst wären ausgerechnet die
//  bestehenden Konten die einzigen, die beim Wechsel ihre Farbe behalten.
//  Wer bewusst eine eigene Farbe gewählt hat, behält sie; nur ein Wert, der
//  exakt einer der acht alten Standardfarben entspricht, wird als automatisch
//  gelesen.
// =============================================================================

import { seriesColor, seriesPalette } from './palettes.js'

// Die festen Farben von vor der Paletten-Auswahl, nach Platz.
export const LEGACY_PALETTE = [
  '#3b82f6', // blau
  '#ec4899', // pink
  '#10b981', // grün
  '#f59e0b', // amber
  '#8b5cf6', // violett
  '#14b8a6', // teal
  '#ef4444', // rot
  '#64748b', // slate
]

// Was in der Datenbank steht, wenn ein Platz automatisch vergeben wurde.
export function autoColorSlot(index) {
  const n = seriesPalette().length
  return `series-${(((index % n) + n) % n) + 1}`
}

// Platz (0-basiert) eines automatisch vergebenen Werts, sonst null.
export function autoSlotOf(color) {
  if (!color) return null
  const m = /^series-(\d+)$/.exec(String(color).trim())
  if (m) return Number(m[1]) - 1
  const legacy = LEGACY_PALETTE.indexOf(String(color).trim().toLowerCase())
  return legacy >= 0 ? legacy : null
}

// Farbe eines Kontos: automatischer Platz > eigene color > Platz in der Liste.
export function accountColor(account, accounts = []) {
  const slot = autoSlotOf(account?.color)
  if (slot !== null) return seriesColor(slot)
  if (account?.color) return account.color
  const i = accounts.findIndex((a) => a.id === account?.id)
  return seriesColor(i < 0 ? 0 : i)
}

// { accountId: color } und { accountName: color }
export function colorMaps(accounts = []) {
  const byId = {}
  const byName = {}
  accounts.forEach((a, i) => {
    const slot = autoSlotOf(a.color)
    const c = slot !== null ? seriesColor(slot) : a.color || seriesColor(i)
    byId[a.id] = c
    byName[a.name] = c
  })
  return { byId, byName }
}
