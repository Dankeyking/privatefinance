// =============================================================================
//  merge.js — legt manuelle Browser-Daten über die Basis (Enable Banking/Mock)
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
  // Daueraufträge / Beiträge: falls manuell gepflegt, komplett ersetzen.
  if (Array.isArray(manual.standingOrders)) out.standingOrders = manual.standingOrders
  if (Array.isArray(manual.transfers)) out.transfers = manual.transfers

  return out
}
