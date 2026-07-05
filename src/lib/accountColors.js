// =============================================================================
//  accountColors.js — Farben je Konto (für Fluss, Karten, Tabellen)
// =============================================================================
//  Distinkte, gut unterscheidbare Palette. Konten können eine eigene `color`
//  tragen; sonst wird nach Reihenfolge aus der Palette vergeben.
// =============================================================================

export const ACCOUNT_PALETTE = [
  '#3b82f6', // blau
  '#ec4899', // pink
  '#10b981', // grün
  '#f59e0b', // amber
  '#8b5cf6', // violett
  '#14b8a6', // teal
  '#ef4444', // rot
  '#64748b', // slate
]

// Farbe eines Kontos: eigene color > Palette nach Position > Fallback.
export function accountColor(account, accounts = []) {
  if (account?.color) return account.color
  const i = accounts.findIndex((a) => a.id === account?.id)
  return ACCOUNT_PALETTE[(i < 0 ? 0 : i) % ACCOUNT_PALETTE.length]
}

// { accountId: color } und { accountName: color }
export function colorMaps(accounts = []) {
  const byId = {}
  const byName = {}
  accounts.forEach((a, i) => {
    const c = a.color || ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length]
    byId[a.id] = c
    byName[a.name] = c
  })
  return { byId, byName }
}
