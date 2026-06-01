// =============================================================================
//  flows.js — baut Sankey-Flüsse aus den Daten: Einkommen → Konten → Kategorien
// =============================================================================

import { toMonthly } from './normalize.js'
import { categoryColor } from './categories.js'
import { effectiveCategoryOf, sortedMonths, monthKey } from './selectors.js'

const INCOME_COLOR = '#16a34a'
const JOINT_COLOR = '#3b82f6'
const PERSONAL_COLOR = '#64748b'

// Liefert { data, labels, colors, columns } für chartjs-chart-sankey.
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

  // 1) Einkommen (extern) -> Konto  (letzter Monat, ohne interne Umbuchungen)
  transactions.forEach((t) => {
    if (t.internal || t.amount <= 0) return
    if (latest && monthKey(t.date) !== latest) return
    const acc = accById[t.accountId]
    if (!acc) return
    addFlow(t.recipient, acc.name, t.amount)
    nodeColors[t.recipient] = INCOME_COLOR
    columns[t.recipient] = 0
  })

  // 2) Interne Überträge Gemeinschaftskonto -> Privatkonto (letzter Monat)
  const joint = accounts.find((a) => a.type === 'joint')
  transactions.forEach((t) => {
    if (!t.internal || t.amount <= 0) return
    if (latest && monthKey(t.date) !== latest) return
    const acc = accById[t.accountId]
    if (!acc || acc.type !== 'personal' || !joint) return
    addFlow(joint.name, acc.name, t.amount)
  })

  // Konten-Knoten einfärben + Spalten setzen
  accounts.forEach((a) => {
    nodeColors[a.name] = a.type === 'joint' ? JOINT_COLOR : PERSONAL_COLOR
    columns[a.name] = a.type === 'joint' ? 1 : 2
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

  return { flows, nodeColors, columns }
}
