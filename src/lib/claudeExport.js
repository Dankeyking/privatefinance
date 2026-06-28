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
  personSummary,
  accountFlows,
} from './recurring.js'

const TASK_PROMPT =
  'Analysiere diese manuell gepflegte Fixkosten-Übersicht. Modell: mehrere Konten ' +
  '(privat + gemeinsam), je Konto Fixkosten und Abos. Jährliche/vierteljährliche Posten ' +
  'sind auf Monatsbasis normalisiert (monthly = jährlich ÷ 12 bzw. vierteljährlich ÷ 3) – ' +
  'das ist der Betrag, der monatlich aufs jeweilige Konto gebucht werden sollte ' +
  '(byAccount.total). Sage mir konkret: (1) Wo gibt es Einsparpotenzial, besonders bei Abos? ' +
  '(2) Wie verteilen sich die Kosten auf Kategorien und Konten? (3) Wie hoch ist die ' +
  'monatliche Sparrate/Überschuss und wie ließe sie sich erhöhen?'

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
    accountName: accountById[so.accountId]?.name || so.accountId,
    category: effectiveCategoryOf(so, overrides),
    monthlyCost: round(toMonthly(so.amount, so.rhythm)),
    split: so.split || { mode: 'even' },
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
    reserve: round(a.reserve),
    total: round(a.total),
    perYear: round(a.total * 12),
  }))

  const persons = personSummary(data).map((p) => ({
    person: p.person,
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
    summary: {
      totalIncome: round(household.totalIncome),
      totalCosts: round(household.totalCosts),
      surplus: round(household.surplus),
      byAccount,
      personSummary: persons,
      flows: accountFlows(data).flows,
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
