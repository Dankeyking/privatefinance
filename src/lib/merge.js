// =============================================================================
//  merge.js — legt manuelle Browser-Daten über die Basis (Demo-Daten)
// =============================================================================

export function mergeData(base, manual = {}) {
  if (!base) return base
  const out = { ...base }

  // Konten: manuelle Liste ersetzt die Basis vollständig (Settings/Konten-Seite
  // speichern immer die komplette Liste) – sonst tauchen gelöschte Konten wieder
  // auf. Bekannte Basis-Konten liefern dabei fehlende Felder (z. B. currency).
  if (Array.isArray(manual.accounts) && manual.accounts.length) {
    const byId = Object.fromEntries((base.accounts || []).map((a) => [a.id, a]))
    out.accounts = manual.accounts.map((m) => ({ ...byId[m.id], ...m }))
  }
  // Einnahmen / Fixkosten & Abos / Umbuchungen: falls manuell gepflegt, ersetzen.
  if (Array.isArray(manual.incomes)) out.incomes = manual.incomes
  if (Array.isArray(manual.standingOrders)) out.standingOrders = manual.standingOrders
  if (Array.isArray(manual.transfers)) out.transfers = manual.transfers
  if (Array.isArray(manual.debts)) out.debts = manual.debts

  return out
}
