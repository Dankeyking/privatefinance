// =============================================================================
//  cash.js — Bargeld-Abhebungen und ihre Aufteilung
// =============================================================================

import { isCashWithdrawal } from './categories.js'

// Alle Bargeld-Abhebungen (Ausgänge), neueste zuerst.
export function listWithdrawals(transactions = []) {
  return transactions
    .filter((t) => !t.internal && t.amount < 0 && isCashWithdrawal(t))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function allocationTotal(allocs = []) {
  return Number(allocs.reduce((s, a) => s + (Number(a.amount) || 0), 0).toFixed(2))
}

// Noch nicht zugeordneter Rest einer Abhebung (>= 0).
export function withdrawalRemaining(tx, allocs = []) {
  return Number((Math.abs(tx.amount) - allocationTotal(allocs)).toFixed(2))
}
