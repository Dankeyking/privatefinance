// =============================================================================
//  flows.js — balancierter Cashflow-Sankey (3 Spalten, ein zusammenhängender Fluss)
//  Privatkonten → Gemeinschaftskonto → Kategorien + Überschuss/Rücklage
// =============================================================================
//  Die Gehälter zählen zum Zufluss der Privatkonten (für die Knotengröße und den
//  Überschuss), werden aber NICHT als eigene Spalte gezeichnet – das hielt das
//  Diagramm gedrängt und ließ Labels überlappen. Jeder Euro wird verfolgt: was
//  nicht ausgegeben/überwiesen wird, fließt sichtbar in „Überschuss / Rücklage".
// =============================================================================

import { formatEUR } from './normalize.js'
import { categoryColor } from './categories.js'
import { effectiveCategoryOf, sortedMonths } from './selectors.js'

const JOINT_COLOR = '#3b82f6'
const PERSONAL_COLOR = '#94a3b8'
const SURPLUS_COLOR = '#0d9488'
const SURPLUS_NODE = 'Überschuss / Rücklage'

export function buildSankeyData(data, overrides = {}) {
  const { accounts = [], transactions = [] } = data
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const accById2 = Object.fromEntries(accounts.map((a) => [a.name, a]))
  const nMonths = Math.max(1, sortedMonths(transactions).length)

  const nodeColors = {}
  const columns = {}

  const transferSum = {} // "von||nach" Konto->Konto
  const expenseSum = {} // "konto||kategorie"
  const inflowAcc = {} // gesamter Zufluss je Konto (inkl. Gehalt) – für Überschuss
  const outflowAcc = {} // gesamter Abfluss je Konto

  transactions.forEach((t) => {
    const acc = accById[t.accountId]
    if (!acc) return
    if (!t.internal && t.amount > 0) {
      // Gehalt/Einkommen: zählt als Zufluss, wird aber nicht als Spalte gezeichnet
      inflowAcc[acc.name] = (inflowAcc[acc.name] || 0) + t.amount
    } else if (t.internal && t.amount > 0 && t.fromAccountId) {
      const src = accById[t.fromAccountId]
      if (!src) return
      const k = `${src.name}||${acc.name}`
      transferSum[k] = (transferSum[k] || 0) + t.amount
      inflowAcc[acc.name] = (inflowAcc[acc.name] || 0) + t.amount
      outflowAcc[src.name] = (outflowAcc[src.name] || 0) + t.amount
    } else if (!t.internal && t.amount < 0) {
      const cat = effectiveCategoryOf(t, overrides)
      const k = `${acc.name}||${cat}`
      expenseSum[k] = (expenseSum[k] || 0) + -t.amount
      outflowAcc[acc.name] = (outflowAcc[acc.name] || 0) + -t.amount
      nodeColors[cat] = categoryColor(cat)
      columns[cat] = 2
    }
  })

  const flowMap = {}
  const add = (from, to, value) => {
    if (!value || value <= 0 || from === to) return
    flowMap[`${from}||${to}`] = (flowMap[`${from}||${to}`] || 0) + value
  }
  const addAveraged = (sums) =>
    Object.entries(sums).forEach(([k, v]) => {
      const [from, to] = k.split('||')
      add(from, to, v / nMonths)
    })

  addAveraged(transferSum)
  addAveraged(expenseSum)

  // Konten: Privat = Spalte 0, Gemeinschaft = Spalte 1
  accounts.forEach((a) => {
    nodeColors[a.name] = a.type === 'joint' ? JOINT_COLOR : PERSONAL_COLOR
    columns[a.name] = a.type === 'joint' ? 1 : 0
  })

  // Überschuss je Konto = Zufluss − Abfluss (inkl. Gehalt), als Fluss zur Rücklage
  accounts.forEach((a) => {
    const surplus = ((inflowAcc[a.name] || 0) - (outflowAcc[a.name] || 0)) / nMonths
    add(a.name, SURPLUS_NODE, surplus)
  })
  nodeColors[SURPLUS_NODE] = SURPLUS_COLOR
  columns[SURPLUS_NODE] = 2

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
  // Kurze Anzeigenamen, damit die Labels benachbarter Spalten nicht überlappen.
  const displayName = (name) => {
    const a = accById2[name]
    if (a) return a.type === 'joint' ? 'Gemeinschaft' : `${a.owner || a.name} (privat)`
    if (name === SURPLUS_NODE) return 'Rücklage'
    return name
  }
  const labels = {}
  Object.keys(nodeColors).forEach((name) => {
    const through = Math.max(inSum[name] || 0, outSum[name] || 0)
    labels[name] = `${displayName(name)}  ·  ${formatEUR(through)}`
  })

  return { flows, nodeColors, columns, labels }
}
