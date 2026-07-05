// =============================================================================
//  merge.js — legt manuelle Browser-Daten über die Basis (Demo-Daten)
// =============================================================================

export function mergeData(base, manual = {}) {
  if (!base) return base
  const out = { ...base }

  if (Array.isArray(manual.accounts) && manual.accounts.length) {
    const byId = Object.fromEntries((base.accounts || []).map((a) => [a.id, a]))
    manual.accounts.forEach((m) => {
      byId[m.id] = { ...byId[m.id], ...m }
    })
    out.accounts = Object.values(byId)
  }
  // Einnahmen / Fixkosten & Abos / Umbuchungen: falls manuell gepflegt, ersetzen.
  if (Array.isArray(manual.incomes)) out.incomes = manual.incomes
  if (Array.isArray(manual.standingOrders)) out.standingOrders = manual.standingOrders
  if (Array.isArray(manual.transfers)) out.transfers = manual.transfers

  return out
}
