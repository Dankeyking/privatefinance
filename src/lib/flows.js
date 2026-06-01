// =============================================================================
//  flows.js — balancierter Cashflow-Sankey
//  Einkommen → Privatkonten → Gemeinschaftskonto → Kategorien + Überschuss
// =============================================================================
//  Jeder Euro wird verfolgt: was nicht an Fixkosten/Kategorien geht, fließt in
//  den Knoten "Überschuss / Rücklage". Dadurch sind alle Konten-Knoten
//  balanciert (Zufluss = Abfluss) und das Diagramm liest als EIN Fluss.
//  Basis: durchschnittliche Monatswerte aus den echten Transaktionen.
// =============================================================================

import { formatEUR } from './normalize.js'
import { categoryColor } from './categories.js'
import { effectiveCategoryOf, sortedMonths } from './selectors.js'

const INCOME_COLOR = '#16a34a'
const JOINT_COLOR = '#3b82f6'
const PERSONAL_COLOR = '#94a3b8'
const SURPLUS_COLOR = '#0d9488'
const SURPLUS_NODE = 'Überschuss / Rücklage'

export function buildSankeyData(data, overrides = {}) {
  const { accounts = [], transactions = [] } = data
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const nMonths = Math.max(1, sortedMonths(transactions).length)

  const nodeColors = {}
  const columns = {}

  // Summen über alle Monate sammeln (danach auf Monatsdurchschnitt teilen)
  const incomeSum = {}
  const transferSum = {}
  const expenseSum = {}

  transactions.forEach((t) => {
    const acc = accById[t.accountId]
    if (!acc) return
    if (!t.internal && t.amount > 0) {
      // Einkommen (extern) -> Konto
      const k = `${t.recipient}||${acc.name}`
      incomeSum[k] = (incomeSum[k] || 0) + t.amount
      nodeColors[t.recipient] = INCOME_COLOR
      columns[t.recipient] = 0
    } else if (t.internal && t.amount > 0 && t.fromAccountId) {
      // interner Übertrag Quelle -> Ziel
      const src = accById[t.fromAccountId]
      if (!src) return
      const k = `${src.name}||${acc.name}`
      transferSum[k] = (transferSum[k] || 0) + t.amount
    } else if (!t.internal && t.amount < 0) {
      // Ausgabe -> Kategorie
      const cat = effectiveCategoryOf(t, overrides)
      const k = `${acc.name}||${cat}`
      expenseSum[k] = (expenseSum[k] || 0) + -t.amount
      nodeColors[cat] = categoryColor(cat)
      columns[cat] = 3
    }
  })

  const flowMap = {}
  const add = (from, to, value) => {
    if (!value || value <= 0 || from === to) return
    const k = `${from}||${to}`
    flowMap[k] = (flowMap[k] || 0) + value
  }
  const addAveraged = (sums) =>
    Object.entries(sums).forEach(([k, v]) => {
      const [from, to] = k.split('||')
      add(from, to, v / nMonths)
    })

  addAveraged(incomeSum)
  addAveraged(transferSum)
  addAveraged(expenseSum)

  // Konten-Knoten einfärben + Spalten (Privat = 1, Gemeinschaft = 2)
  accounts.forEach((a) => {
    nodeColors[a.name] = a.type === 'joint' ? JOINT_COLOR : PERSONAL_COLOR
    columns[a.name] = a.type === 'joint' ? 2 : 1
  })

  // Balance: pro Konto verbleibenden Überschuss als Fluss -> Rücklage-Knoten.
  // Zuerst alle Salden berechnen, dann hinzufügen (sonst verfälscht es sich).
  const surpluses = accounts.map((a) => {
    let inflow = 0
    let outflow = 0
    for (const [k, v] of Object.entries(flowMap)) {
      const [from, to] = k.split('||')
      if (to === a.name) inflow += v
      if (from === a.name) outflow += v
    }
    return [a.name, inflow - outflow]
  })
  surpluses.forEach(([name, s]) => add(name, SURPLUS_NODE, s))
  nodeColors[SURPLUS_NODE] = SURPLUS_COLOR
  columns[SURPLUS_NODE] = 3

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
