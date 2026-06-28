// =============================================================================
//  recurring.js — Auswertungen aus den wiederkehrenden Posten (manuelles Modell)
// =============================================================================
//  Alle Beträge werden über toMonthly auf eine Monatsbasis normalisiert.
//  Personen werden aus dem `owner` der Privatkonten abgeleitet (nicht hartkodiert).
// =============================================================================

import { toMonthly } from './normalize.js'
import { effectiveCategoryOf } from './selectors.js'

export function accountsById(accounts = []) {
  return Object.fromEntries(accounts.map((a) => [a.id, a]))
}

// Person eines Kontos: owner eines Privatkontos, sonst null.
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

// Monatslast je Konto, aufgeteilt nach Fixkosten / Abos.
// `reserve` = monatlicher Anteil aus nicht-monatlichen Posten (jährlich/12,
// vierteljährlich/3), also die Rücklage, die monatlich aufs Konto soll.
// `total` ist der gesamte Betrag, der monatlich aufs Konto gebucht werden sollte.
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

// Kosten je Person: private Fixkosten/Abos + Verteilung auf gemeinsame Konten.
export function monthlyByPerson(data) {
  const { accounts = [], standingOrders = [], transfers = [] } = data
  const byId = accountsById(accounts)
  const persons = personsFromAccounts(accounts)
  const map = Object.fromEntries(
    persons.map((p) => [p, { person: p, personalCosts: 0, allocations: 0, total: 0 }]),
  )
  standingOrders.forEach((o) => {
    const p = ownerOf(byId[o.accountId])
    if (p && map[p]) map[p].personalCosts += toMonthly(o.amount, o.rhythm)
  })
  transfers.forEach((t) => {
    const p = ownerOf(byId[t.fromAccountId])
    if (p && map[p]) map[p].allocations += toMonthly(t.amount, t.rhythm || 'monthly')
  })
  persons.forEach((p) => {
    map[p].total = map[p].personalCosts + map[p].allocations
  })
  return persons.map((p) => map[p])
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

// Haushalts-Summe: Gesamteinkommen, Gesamtkosten (nur Fixkosten/Abos), Überschuss.
// Verteilungen sind interne Umbuchungen und zählen NICHT als Kosten.
export function householdSummary(data) {
  const { standingOrders = [], incomes = [] } = data
  const totalCosts = standingOrders.reduce((s, o) => s + toMonthly(o.amount, o.rhythm), 0)
  const totalIncome = incomes.reduce((s, i) => s + toMonthly(i.amount, i.rhythm), 0)
  return { totalIncome, totalCosts, surplus: totalIncome - totalCosts }
}

// Pro Person: Einkommen, Gesamtkosten, Überschuss (was nach Verteilung + privaten
// Kosten übrig bleibt).
export function personSummary(data) {
  const costs = monthlyByPerson(data)
  const incById = Object.fromEntries(incomeByPerson(data).map((i) => [i.person, i.income]))
  return costs.map((c) => ({
    person: c.person,
    personalCosts: c.personalCosts,
    allocations: c.allocations,
    costs: c.total,
    income: incById[c.person] || 0,
    surplus: (incById[c.person] || 0) - c.total,
  }))
}
