// =============================================================================
//  selectors.js — abgeleitete Werte aus den Rohdaten (für KPIs & Charts)
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
// Optional auf einen Monat begrenzen. Bargeld-Abhebungen mit Aufteilung werden
// auf ihre Kategorien verteilt; der nicht zugeordnete Rest bleibt „Bargeld".
export function expensesByCategory(transactions, overrides = {}, onlyMonth = null, allocations = {}) {
  const totals = {}
  const add = (cat, amt) => {
    if (amt > 0) totals[cat] = (totals[cat] || 0) + amt
  }
  transactions.forEach((t) => {
    if (t.internal || t.amount >= 0) return
    if (onlyMonth && monthKey(t.date) !== onlyMonth) return
    const allocs = allocations[t.id]
    if (allocs && allocs.length) {
      let allocated = 0
      allocs.forEach((a) => {
        const amt = Number(a.amount) || 0
        add(a.category, amt)
        allocated += amt
      })
      add(effectiveCategoryOf(t, overrides), -t.amount - allocated) // Rest
    } else {
      add(effectiveCategoryOf(t, overrides), -t.amount)
    }
  })
  return totals
}

// Gesamtsaldo aller Konten.
export function totalBalance(accounts) {
  return accounts.reduce((s, a) => s + (a.balance || 0), 0)
}

// Vermögens-Trend: Gesamtsaldo aktuell vs. Vormonat (aus balanceHistory).
export function netWorthTrend(balanceHistory = [], accounts = []) {
  if (!balanceHistory || balanceHistory.length < 2) return null
  const sumPoint = (p) => accounts.reduce((s, a) => s + (p[a.id] || 0), 0)
  const last = sumPoint(balanceHistory[balanceHistory.length - 1])
  const prev = sumPoint(balanceHistory[balanceHistory.length - 2])
  const deltaAbs = last - prev
  const deltaPct = prev ? (deltaAbs / prev) * 100 : 0
  return { current: last, deltaAbs, deltaPct }
}

// Saldoverlauf inkl. Prognose: hängt `future` Monate an, fortgeschrieben mit dem
// durchschnittlichen Monatsdelta je Konto. splitIndex = letzter echter Datenpunkt.
export function forecastBalances(data, future = 3) {
  const { balanceHistory = [], accounts = [] } = data
  if (balanceHistory.length === 0) return { labels: [], series: [], splitIndex: 0 }
  const n = balanceHistory.length
  const histLabels = balanceHistory.map((p) => monthLabel(monthKey(p.date)))

  const series = accounts.map((a) => {
    const hist = balanceHistory.map((p) => p[a.id] ?? null)
    const first = balanceHistory[0][a.id] || 0
    const last = balanceHistory[n - 1][a.id] || 0
    const avgDelta = n > 1 ? (last - first) / (n - 1) : 0
    const proj = []
    let v = last
    for (let i = 1; i <= future; i++) {
      v += avgDelta
      proj.push(Number(v.toFixed(2)))
    }
    return { label: a.name, data: [...hist, ...proj] }
  })

  const lastDate = new Date(balanceHistory[n - 1].date)
  const futureLabels = []
  for (let i = 1; i <= future; i++) {
    const d = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1)
    futureLabels.push(monthLabel(monthKey(d.toISOString())))
  }

  return { labels: [...histLabels, ...futureLabels], series, splitIndex: n - 1 }
}

// Anstehende Daueraufträge: nächste Ausführung innerhalb der nächsten `days` Tage.
// Liefert sortierte Liste mit daysUntil + Kontoname.
export function upcomingPayments(data, days = 30, today = new Date()) {
  const { standingOrders = [], accounts = [] } = data
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const horizon = new Date(start)
  horizon.setDate(horizon.getDate() + days)

  return standingOrders
    .filter((so) => so.nextExecution)
    .map((so) => {
      const due = parseLocalDate(so.nextExecution)
      const daysUntil = Math.round((due - start) / 86400000)
      const acc = accById[so.accountId]
      return { ...so, due, daysUntil, account: acc, runsOnJoint: acc?.type === 'joint' }
    })
    .filter((x) => x.due >= start && x.due <= horizon)
    .sort((a, b) => a.due - b.due)
}
