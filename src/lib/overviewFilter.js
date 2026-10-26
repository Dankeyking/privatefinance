// =============================================================================
//  overviewFilter.js — Filter für die Übersicht
// =============================================================================
//  Die Selektoren in recurring.js lesen alle `data.standingOrders`. Statt jeden
//  einzeln anzufassen, filtern wir die Posten einmal und geben eine Kopie von
//  `data` weiter. So wirkt der Filter überall gleich: Kosten je Konto,
//  Geldfluss, Personen, anstehende Posten.
// =============================================================================

export const EMPTY_FILTER = { person: 'all', accountId: 'all', kind: 'all' }

export function isEmptyFilter(f) {
  return !f || (f.person === 'all' && f.accountId === 'all' && f.kind === 'all')
}

// Trägt die Person den Posten mit? 'single' nur sie, sonst anteilig.
function personInvolved(order, person) {
  const split = order.split || { mode: 'even' }
  if (split.mode === 'single') return split.person === person
  if (split.mode === 'amount' || split.mode === 'percent') {
    return Number(split.shares?.[person] || 0) > 0
  }
  return true // 'even': alle tragen mit
}

export function applyOverviewFilter(data, filter) {
  if (isEmptyFilter(filter)) return data

  const orders = (data.standingOrders || []).filter((o) => {
    if (filter.accountId !== 'all' && o.accountId !== filter.accountId) return false
    if (filter.kind !== 'all' && (o.kind || 'fixed') !== filter.kind) return false
    if (filter.person !== 'all' && !personInvolved(o, filter.person)) return false
    return true
  })

  return { ...data, standingOrders: orders }
}
