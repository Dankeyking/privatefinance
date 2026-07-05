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

// Nächste Fälligkeit eines Postens – dynamisch berechnet (kein gespeichertes
// Datum, das veralten kann). `dueMonth` (1–12) verankert jährliche Posten im
// Jahr bzw. definiert den Quartals-Zyklus. Fallback für alte Daten ohne
// dueMonth: gespeichertes nextExecution, um ganze Intervalle vorgerollt.
// Liefert null, wenn (wegen endDate) keine Zahlung mehr ansteht.
export function nextDueDate(o, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const day = Number(o.executionDay) || 1
  // Tag auf Monatslänge begrenzen (31. im Februar -> 28./29.).
  const at = (year, monthIndex) =>
    new Date(year, monthIndex, Math.min(day, new Date(year, monthIndex + 1, 0).getDate()))
  const step = o.rhythm === 'yearly' ? 12 : o.rhythm === 'quarterly' ? 3 : 1

  let due
  if (step > 1 && o.dueMonth) {
    // kleinster Monat des Zyklus in diesem Jahr, dann in Schritten vorwärts
    let m = (Number(o.dueMonth) - 1) % step
    due = at(start.getFullYear(), m)
    while (due < start) {
      m += step
      due = at(start.getFullYear(), m)
    }
  } else if (step > 1 && o.nextExecution) {
    due = parseLocalDate(o.nextExecution)
    while (due && due < start) due = at(due.getFullYear(), due.getMonth() + step)
  } else {
    due = at(start.getFullYear(), start.getMonth())
    if (due < start) due = at(start.getFullYear(), start.getMonth() + 1)
  }

  if (due && o.endDate) {
    const end = parseLocalDate(o.endDate)
    if (end && due > end) return null
  }
  return due
}

// Anstehende Posten: nächste Ausführung innerhalb der nächsten `days` Tage.
// Liefert sortierte Liste mit daysUntil + Kontoname.
export function upcomingPayments(data, days = 30, today = new Date()) {
  const { standingOrders = [], accounts = [] } = data
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const horizon = new Date(start)
  horizon.setDate(horizon.getDate() + days)

  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return standingOrders
    .filter((so) => isOrderActive(so, today))
    .map((so) => {
      const due = nextDueDate(so, today)
      const daysUntil = due ? Math.round((due - start) / 86400000) : null
      const acc = accById[so.accountId]
      // nextExecution = dynamisch berechnetes Datum (Anzeige), nicht der ggf. veraltete Speicherstand
      return { ...so, due, daysUntil, account: acc, nextExecution: due ? iso(due) : so.nextExecution }
    })
    .filter((x) => x.due && x.due >= start && x.due <= horizon)
    .sort((a, b) => a.due - b.due)
}
