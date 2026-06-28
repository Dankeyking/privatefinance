// =============================================================================
//  claudeExport.js — Analyse-fertiger JSON-Export für Claude
// =============================================================================
//  Erzeugt ein strukturiertes JSON, das den Haushalt manuell abbildet:
//  Konten, Einnahmen, Fixkosten/Abos und die Verteilung – plus fertige
//  Auswertungen (Kosten je Konto, Deckung, Kosten je Person).
// =============================================================================

import { toMonthly } from './normalize.js'
import { effectiveCategoryOf } from './selectors.js'
import {
  householdSummary,
  monthlyByAccount,
  jointCoverage,
  personSummary,
} from './recurring.js'

const TASK_PROMPT =
  'Analysiere diesen manuell gepflegten Haushalt. Das Modell: Die Gehälter gehen auf die ' +
  'Privatkonten; nach Gehaltseingang wird direkt auf mehrere gemeinsame Konten verteilt ' +
  '(Gemeinschaft, Haushalt, Urlaub, Wohnung & Versicherungen), die jeweils ihre Fixkosten ' +
  'und Abos tragen. Sage mir konkret: (1) Sind alle gemeinsamen Konten durch die Verteilung ' +
  'gedeckt (siehe coverage.delta < 0 = Lücke)? (2) Wo gibt es Einsparpotenzial bei Abos? ' +
  '(3) Ist die Verteilung zwischen den Personen fair im Verhältnis zum Einkommen ' +
  '(siehe personSummary)? (4) Wie hoch ist die monatliche Sparrate/Überschuss und wie ' +
  'ließe sie sich erhöhen? Nutze die normalisierten Monatswerte (monthly).'

const round = (n) => Number((n || 0).toFixed(2))

export function buildClaudeExport(data, overrides = {}) {
  const accounts = data.accounts || []
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]))

  const standingOrders = (data.standingOrders || []).map((so) => ({
    id: so.id,
    recipient: so.recipient,
    amount: so.amount,
    rhythm: so.rhythm,
    kind: so.kind || 'fixed',
    accountId: so.accountId,
    accountName: accountById[so.accountId]?.name || so.accountId,
    category: effectiveCategoryOf(so, overrides),
    monthlyCost: round(toMonthly(so.amount, so.rhythm)),
  }))

  const incomes = (data.incomes || []).map((i) => ({
    name: i.name,
    amount: i.amount,
    rhythm: i.rhythm,
    accountName: accountById[i.accountId]?.name || i.accountId,
    monthly: round(toMonthly(i.amount, i.rhythm)),
  }))

  const byAccount = monthlyByAccount(data).map((a) => ({
    account: a.account.name,
    type: a.account.type,
    fixed: round(a.fixed),
    subscription: round(a.subscription),
    total: round(a.total),
  }))

  const coverage = jointCoverage(data).map((c) => ({
    account: c.account.name,
    needed: round(c.needed),
    funded: round(c.funded),
    delta: round(c.delta),
    covered: c.covered,
  }))

  const persons = personSummary(data).map((p) => ({
    person: p.person,
    personalCosts: round(p.personalCosts),
    allocations: round(p.allocations),
    totalCosts: round(p.costs),
    income: round(p.income),
    surplus: round(p.surplus),
  }))

  const household = householdSummary(data)

  return {
    meta: { exportedAt: new Date().toISOString(), currency: 'EUR', app: 'PrivateFinance' },
    task: TASK_PROMPT,
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, owner: a.owner, balance: a.balance })),
    incomes,
    standingOrders,
    transfers: (data.transfers || []).map((t) => ({
      recipient: t.recipient,
      amount: t.amount,
      from: accountById[t.fromAccountId]?.name || t.fromAccountId,
      to: accountById[t.toAccountId]?.name || t.toAccountId,
      monthly: round(toMonthly(t.amount, t.rhythm || 'monthly')),
    })),
    summary: {
      totalIncome: round(household.totalIncome),
      totalCosts: round(household.totalCosts),
      surplus: round(household.surplus),
      byAccount,
      coverage,
      personSummary: persons,
    },
  }
}

// Löst den Download der Export-Datei im Browser aus.
export function downloadClaudeExport(data, overrides = {}) {
  const payload = buildClaudeExport(data, overrides)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `privatefinance-export-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return payload
}
