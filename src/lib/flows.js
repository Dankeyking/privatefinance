// =============================================================================
//  flows.js — baut Sankey-Flüsse: Einkommen → Privatkonten → Gemeinschaftskonto
//             → Kategorien (plus direkte Zahlungen vom Privatkonto)
// =============================================================================

import { toMonthly, formatEUR } from './normalize.js'
import { categoryColor } from './categories.js'
import { effectiveCategoryOf, sortedMonths, monthKey } from './selectors.js'

const INCOME_COLOR = '#16a34a'
const JOINT_COLOR = '#3b82f6'
const PERSONAL_COLOR = '#94a3b8'

// Liefert { flows, nodeColors, columns, labels } für chartjs-chart-sankey.
export function buildSankeyData(data, overrides = {}) {
  const { accounts = [], standingOrders = [], transactions = [] } = data
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const months = sortedMonths(transactions)
  const latest = months[months.length - 1]

  const flowMap = {} // "from||to" -> flow
  const addFlow = (from, to, value) => {
    if (!value || from === to) return
    const k = `${from}||${to}`
    flowMap[k] = (flowMap[k] || 0) + value
  }

  const nodeColors = {}
  const columns = {}

  // 1) Einkommen (extern) -> Privatkonto (letzter Monat, ohne interne Umbuchungen)
  transactions.forEach((t) => {
    if (t.internal || t.amount <= 0) return
    if (latest && monthKey(t.date) !== latest) return
    const acc = accById[t.accountId]
    if (!acc) return
    addFlow(t.recipient, acc.name, t.amount)
    nodeColors[t.recipient] = INCOME_COLOR
    columns[t.recipient] = 0
  })

  // 2) Interne Überträge Privatkonto -> Gemeinschaftskonto (letzter Monat).
  //    Quelle steht als fromAccountId auf der Gutschrift-Buchung.
  transactions.forEach((t) => {
    if (!t.internal || t.amount <= 0 || !t.fromAccountId) return
    if (latest && monthKey(t.date) !== latest) return
    const target = accById[t.accountId]
    const source = accById[t.fromAccountId]
    if (!target || !source) return
    addFlow(source.name, target.name, t.amount)
  })

  // Konten-Knoten einfärben + Spalten (Privat = 1, Gemeinschaft = 2)
  accounts.forEach((a) => {
    nodeColors[a.name] = a.type === 'joint' ? JOINT_COLOR : PERSONAL_COLOR
    columns[a.name] = a.type === 'joint' ? 2 : 1
  })

  // 3) Konto -> Kategorie (Daueraufträge, auf Monat normalisiert)
  standingOrders.forEach((so) => {
    const acc = accById[so.accountId]
    if (!acc) return
    const cat = effectiveCategoryOf(so, overrides)
    addFlow(acc.name, cat, toMonthly(so.amount, so.rhythm))
    nodeColors[cat] = categoryColor(cat)
    columns[cat] = 3
  })

  const flows = Object.entries(flowMap).map(([k, flow]) => {
    const [from, to] = k.split('||')
    return { from, to, flow: Number(flow.toFixed(2)) }
  })

  // Knoten-Beschriftung inkl. Durchsatz (max aus Zu-/Abfluss)
  const inSum = {}
  const outSum = {}
  flows.forEach((f) => {
    outSum[f.from] = (outSum[f.from] || 0) + f.flow
    inSum[f.to] = (inSum[f.to] || 0) + f.flow
  })
  const labels = {}
  Object.keys(nodeColors).forEach((name) => {
    const through = Math.max(inSum[name] || 0, outSum[name] || 0)
    labels[name] = `${name}  ·  ${formatEUR(through)}`
  })

  return { flows, nodeColors, columns, labels }
}
