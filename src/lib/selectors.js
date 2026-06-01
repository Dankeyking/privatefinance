// =============================================================================
//  selectors.js — abgeleitete Werte aus den Rohdaten (für KPIs & Charts)
// =============================================================================

import { autoCategorize } from './categories.js'

export function monthKey(dateLike) {
  const d = new Date(dateLike)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const names = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return `${names[Number(m) - 1]} ${y.slice(2)}`
}

// Effektive Kategorie eines Items (Transaktion oder Auftrag):
// manuelles Override > vorhandene Kategorie > Auto-Kategorisierung.
export function effectiveCategoryOf(item, overrides = {}) {
  if (overrides[item.id]) return overrides[item.id]
  if (item.category) return item.category
  return autoCategorize(item.recipient || '', item.description || '')
}

// Sortierte Liste der vorhandenen Monatsschlüssel (älteste zuerst).
export function sortedMonths(transactions) {
  const set = new Set(transactions.map((t) => monthKey(t.date)))
  return [...set].sort()
}

// Einnahmen/Ausgaben eines Monats (interne Umbuchungen ausgenommen).
export function incomeExpenseForMonth(transactions, key) {
  let income = 0
  let expenses = 0
  transactions.forEach((t) => {
    if (t.internal) return
    if (monthKey(t.date) !== key) return
    if (t.amount > 0) income += t.amount
    else expenses += -t.amount
  })
  return { income, expenses, surplus: income - expenses }
}

// Buckets für die letzten N Monate -> {labels, income[], expenses[]}.
export function last6MonthBuckets(transactions, n = 6) {
  const months = sortedMonths(transactions).slice(-n)
  const labels = months.map(monthLabel)
  const income = months.map((k) => incomeExpenseForMonth(transactions, k).income)
  const expenses = months.map((k) => incomeExpenseForMonth(transactions, k).expenses)
  return { months, labels, income, expenses }
}

// Ausgaben je Kategorie (interne Umbuchungen + Einnahmen ausgenommen).
// Optional auf einen Monat begrenzen.
export function expensesByCategory(transactions, overrides = {}, onlyMonth = null) {
  const totals = {}
  transactions.forEach((t) => {
    if (t.internal || t.amount >= 0) return
    if (onlyMonth && monthKey(t.date) !== onlyMonth) return
    const cat = effectiveCategoryOf(t, overrides)
    totals[cat] = (totals[cat] || 0) + -t.amount
  })
  return totals
}

// Gesamtsaldo aller Konten.
export function totalBalance(accounts) {
  return accounts.reduce((s, a) => s + (a.balance || 0), 0)
}
