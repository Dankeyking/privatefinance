// =============================================================================
//  selectors.js — abgeleitete Basiswerte (Datum, Kategorie, anstehende Posten)
// =============================================================================

import { autoCategorize } from './categories.js'

export function monthKey(dateLike) {
  const d = new Date(dateLike)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Parst "YYYY-MM-DD" als LOKALES Datum (Mitternacht), nicht als UTC –
// sonst verschiebt sich der Tag in westlichen Zeitzonen um einen Tag.
export function parseLocalDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const names = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return `${names[Number(m) - 1]} ${y.slice(2)}`
}

// Effektive Kategorie eines Items (Auftrag/Posten):
// manuelles Override > vorhandene Kategorie > Auto-Kategorisierung.
export function effectiveCategoryOf(item, overrides = {}) {
  if (overrides[item.id]) return overrides[item.id]
  if (item.category) return item.category
  return autoCategorize(item.recipient || '', item.description || '')
}

// --- Enddatum (Raten/Kündigungen) -------------------------------------------
// Posten können optional ein `endDate` (YYYY-MM-DD) tragen, z. B. Ratenkäufe
// oder gekündigte Abos. Nach dem Enddatum zählt der Posten in keinen
// Auswertungen mehr mit (bleibt aber in den Tabellen sichtbar).

export function isOrderActive(o, today = new Date()) {
  if (!o?.endDate) return true
  const end = parseLocalDate(o.endDate)
  if (!end) return true
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return end >= t
}

export function activeOrders(standingOrders = [], today = new Date()) {
  return standingOrders.filter((o) => isOrderActive(o, today))
}

// Verbleibende Monate (≈ Raten) bis zum Enddatum; null ohne Enddatum.
export function monthsRemaining(o, today = new Date()) {
  if (!o?.endDate) return null
  const end = parseLocalDate(o.endDate)
  if (!end) return null
  const months =
    (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth()) + 1
  return Math.max(0, months)
}

// Anstehende Posten: nächste Ausführung innerhalb der nächsten `days` Tage.
// Liefert sortierte Liste mit daysUntil + Kontoname.
export function upcomingPayments(data, days = 30, today = new Date()) {
  const { standingOrders = [], accounts = [] } = data
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const horizon = new Date(start)
  horizon.setDate(horizon.getDate() + days)

  return standingOrders
    .filter((so) => so.nextExecution && isOrderActive(so, today))
    .map((so) => {
      const due = parseLocalDate(so.nextExecution)
      const daysUntil = Math.round((due - start) / 86400000)
      const acc = accById[so.accountId]
      return { ...so, due, daysUntil, account: acc }
    })
    .filter((x) => x.due >= start && x.due <= horizon)
    .sort((a, b) => a.due - b.due)
}
