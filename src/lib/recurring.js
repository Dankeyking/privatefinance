// =============================================================================
//  recurring.js — Auswertungen aus den wiederkehrenden Posten (manuelles Modell)
// =============================================================================
//  Jeder Posten (Fixkosten/Abo) hat eine Aufteilung (split), die festlegt, wer
//  welchen Anteil trägt:
//    { mode: 'even' }                       -> gleichmäßig auf alle Personen
//    { mode: 'single', person: 'Elisa' }    -> nur eine Person
//    { mode: 'percent', shares: {A:60,B:40}}-> prozentual
//    { mode: 'amount', shares: {A:720,B:850}}-> feste Beträge (in der Periode)
//  Daraus werden Kosten je Person und der Geldfluss zwischen den Konten
//  abgeleitet. Alle Beträge werden über toMonthly auf Monatsbasis normalisiert.
// =============================================================================

import { toMonthly, formatEUR } from './normalize.js'
import { effectiveCategoryOf } from './selectors.js'

const FLOW_PERSONAL = '#94a3b8'
const FLOW_JOINT = '#3b82f6'

export function accountsById(accounts = []) {
  return Object.fromEntries(accounts.map((a) => [a.id, a]))
}

function ownerOf(acc) {
  if (!acc || acc.type !== 'personal') return null
  return acc.owner || acc.name || null
}

// Distinkte Personen (Reihenfolge = Auftreten der Privatkonten).
export function personsFromAccounts(accounts = []) {
  const seen = []
  accounts
    .filter((a) => a.type === 'personal')
    .forEach((a) => {
      const p = ownerOf(a)
      if (p && !seen.includes(p)) seen.push(p)
    })
  return seen
}

// Monatlicher Anteil einer Person an einem Posten (gemäß Aufteilung).
export function personShareMonthly(cost, person, persons) {
  const split = cost.split || { mode: 'even' }
  const monthly = toMonthly(cost.amount, cost.rhythm)
  switch (split.mode) {
    case 'single':
      return split.person === person ? monthly : 0
    case 'percent':
      return monthly * ((Number(split.shares?.[person]) || 0) / 100)
    case 'amount':
      return toMonthly(Number(split.shares?.[person]) || 0, cost.rhythm)
    default: // even
      return persons.length ? monthly / persons.length : 0
  }
}

// Monatslast je Konto, aufgeteilt nach Fixkosten / Abos.
// `reserve` = monatlicher Anteil aus nicht-monatlichen Posten (jährlich/12,
// vierteljährlich/3). `total` = Betrag, der monatlich aufs Konto soll.
export function monthlyByAccount(data) {
  const { accounts = [], standingOrders = [] } = data
  const slot = Object.fromEntries(
    accounts.map((a) => [a.id, { account: a, fixed: 0, subscription: 0, reserve: 0, total: 0 }]),
  )
  standingOrders.forEach((o) => {
    const s = slot[o.accountId]
    if (!s) return
    const m = toMonthly(o.amount, o.rhythm)
    if (o.kind === 'subscription') s.subscription += m
    else s.fixed += m
    if (o.rhythm !== 'monthly') s.reserve += m
    s.total += m
  })
  return accounts.map((a) => slot[a.id])
}

// Monatskosten je Kategorie (für Donut/Ranking).
export function monthlyByCategory(data, overrides = {}) {
  const { standingOrders = [] } = data
  const totals = {}
  standingOrders.forEach((o) => {
    const cat = effectiveCategoryOf(o, overrides)
    totals[cat] = (totals[cat] || 0) + toMonthly(o.amount, o.rhythm)
  })
  return totals
}

// Kosten je Person: Summe der Anteile über alle Posten.
export function monthlyByPerson(data) {
  const { accounts = [], standingOrders = [] } = data
  const persons = personsFromAccounts(accounts)
  const map = Object.fromEntries(persons.map((p) => [p, 0]))
  standingOrders.forEach((o) => {
    persons.forEach((p) => {
      map[p] += personShareMonthly(o, p, persons)
    })
  })
  return persons.map((p) => ({ person: p, total: map[p] }))
}

// Monatseinkommen je Person (aus den Einnahmen auf den Privatkonten).
export function incomeByPerson(data) {
  const { accounts = [], incomes = [] } = data
  const byId = accountsById(accounts)
  const persons = personsFromAccounts(accounts)
  const map = Object.fromEntries(persons.map((p) => [p, 0]))
  incomes.forEach((i) => {
    const p = ownerOf(byId[i.accountId])
    if (p && p in map) map[p] += toMonthly(i.amount, i.rhythm)
  })
  return persons.map((p) => ({ person: p, income: map[p] }))
}

// Geldfluss zwischen den Konten: jede Person finanziert ihren Anteil jedes
// Postens auf dessen Abbuchungskonto. Läuft der Posten über das eigene
// Privatkonto, entsteht kein Übertrag.
export function accountFlows(data) {
  const { accounts = [], standingOrders = [] } = data
  const byId = accountsById(accounts)
  const persons = personsFromAccounts(accounts)
  // Heimatkonto je Person (erstes Privatkonto mit diesem Inhaber).
  const homeByPerson = {}
  accounts
    .filter((a) => a.type === 'personal')
    .forEach((a) => {
      const p = ownerOf(a)
      if (p && !(p in homeByPerson)) homeByPerson[p] = a
    })

  const flowMap = {}
  standingOrders.forEach((o) => {
    const debit = byId[o.accountId]
    if (!debit) return
    persons.forEach((p) => {
      const share = personShareMonthly(o, p, persons)
      if (share <= 0) return
      const home = homeByPerson[p]
      if (!home || home.id === debit.id) return
      const key = `${home.name}||${debit.name}`
      flowMap[key] = (flowMap[key] || 0) + share
    })
  })

  const flows = Object.entries(flowMap)
    .map(([k, v]) => {
      const [from, to] = k.split('||')
      return { from, to, flow: Number(v.toFixed(2)) }
    })
    .sort((a, b) => b.flow - a.flow)

  const nodeColors = {}
  const columns = {}
  accounts.forEach((a) => {
    nodeColors[a.name] = a.type === 'joint' ? FLOW_JOINT : FLOW_PERSONAL
    columns[a.name] = a.type === 'joint' ? 1 : 0
  })

  const inSum = {}
  const outSum = {}
  flows.forEach((f) => {
    outSum[f.from] = (outSum[f.from] || 0) + f.flow
    inSum[f.to] = (inSum[f.to] || 0) + f.flow
  })
  const labels = {}
  Object.keys(nodeColors).forEach((name) => {
    const through = Math.max(inSum[name] || 0, outSum[name] || 0)
    if (through > 0) labels[name] = `${name} · ${formatEUR(through)}`
  })

  return { flows, nodeColors, columns, labels, total: flows.reduce((s, f) => s + f.flow, 0) }
}

// Haushalts-Summe: Gesamteinkommen, Gesamtkosten (Fixkosten/Abos), Überschuss.
export function householdSummary(data) {
  const { standingOrders = [], incomes = [] } = data
  const totalCosts = standingOrders.reduce((s, o) => s + toMonthly(o.amount, o.rhythm), 0)
  const totalIncome = incomes.reduce((s, i) => s + toMonthly(i.amount, i.rhythm), 0)
  return { totalIncome, totalCosts, surplus: totalIncome - totalCosts }
}

// Pro Person: Gesamtkosten (Summe der Anteile), Einkommen, Überschuss.
export function personSummary(data) {
  const costs = monthlyByPerson(data)
  const incById = Object.fromEntries(incomeByPerson(data).map((i) => [i.person, i.income]))
  return costs.map((c) => ({
    person: c.person,
    costs: c.total,
    income: incById[c.person] || 0,
    surplus: (incById[c.person] || 0) - c.total,
  }))
}
