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
import { accountColor } from './accountColors.js'

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

// Geldfluss zwischen den Konten:
//  1) aus Kosten abgeleitet — jede Person finanziert ihren Anteil jedes Postens
//     auf dessen Abbuchungskonto (kind 'kosten').
//  2) explizite Umbuchungen — vom Nutzer gepflegte Überträge zwischen zwei
//     Konten (kind 'umbuchung'), z. B. Sparen aufs Urlaubskonto.
export function accountFlows(data) {
  const { accounts = [], standingOrders = [], transfers = [] } = data
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

  // 1) Kosten-abgeleitete Flüsse
  const costMap = {}
  standingOrders.forEach((o) => {
    const debit = byId[o.accountId]
    if (!debit) return
    persons.forEach((p) => {
      const share = personShareMonthly(o, p, persons)
      if (share <= 0) return
      const home = homeByPerson[p]
      if (!home || home.id === debit.id) return
      const key = `${home.name}||${debit.name}`
      costMap[key] = (costMap[key] || 0) + share
    })
  })

  // 2) Explizite Umbuchungen
  const transMap = {}
  transfers.forEach((t) => {
    const from = byId[t.fromAccountId]
    const to = byId[t.toAccountId]
    if (!from || !to || from.id === to.id) return
    const amt = toMonthly(t.amount, t.rhythm || 'monthly')
    if (amt <= 0) return
    const key = `${from.name}||${to.name}`
    transMap[key] = (transMap[key] || 0) + amt
  })

  const toRows = (map, kind) =>
    Object.entries(map).map(([k, v]) => {
      const [from, to] = k.split('||')
      return { from, to, flow: Number(v.toFixed(2)), kind }
    })
  const rows = [...toRows(costMap, 'kosten'), ...toRows(transMap, 'umbuchung')].sort((a, b) => b.flow - a.flow)

  // Für die Sankey: pro Kontopaar zusammenfassen.
  const merged = {}
  rows.forEach((r) => { merged[`${r.from}||${r.to}`] = (merged[`${r.from}||${r.to}`] || 0) + r.flow })
  const flows = Object.entries(merged).map(([k, v]) => {
    const [from, to] = k.split('||')
    return { from, to, flow: Number(v.toFixed(2)) }
  })

  const nodeColors = {}
  const columns = {}
  accounts.forEach((a) => {
    nodeColors[a.name] = accountColor(a, accounts)
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

  const hasTransfers = Object.keys(transMap).length > 0
  return {
    flows,
    rows,
    nodeColors,
    // Bei Umbuchungen (auch Konto->Konto in derselben Spalte) automatische
    // Spalten-Anordnung des Sankey nutzen.
    columns: hasTransfers ? undefined : columns,
    labels,
    total: flows.reduce((s, f) => s + f.flow, 0),
    umbuchungTotal: toRows(transMap, 'umbuchung').reduce((s, r) => s + r.flow, 0),
  }
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
