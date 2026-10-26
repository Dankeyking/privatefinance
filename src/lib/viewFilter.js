// =============================================================================
//  viewFilter.js — eine Filterleiste für Übersicht, Kosten & Abos, Schulden, Analyse
// =============================================================================
//  Der Filter liegt in App.jsx und gilt für alle vier Seiten zugleich. Die
//  Selektoren in recurring.js lesen `data.standingOrders`, `data.incomes` und
//  `data.debts`; statt jeden einzeln anzufassen, filtern wir die Daten einmal
//  und geben eine Kopie von `data` weiter.
//
//  Zwei Entscheidungen, die man beim Lesen nicht erraten kann:
//
//  - `kind` umfasst die Schulden mit. 'debt' zeigt nur sie, 'fixed' /
//    'subscription' / 'savings' blenden sie aus. Sonst müsste man beim
//    Filtern auf „Abos" entscheiden, ob Schulden Abos sind — sie sind keine.
//  - Eine Schuld hat keine Aufteilung wie ein Fixkostenposten. Als ihre Person
//    gilt darum der Inhaber des Kontos, von dem die Rate abgeht; bei einem
//    gemeinsamen Konto zählt sie für beide. Schulden ohne Konto bleiben immer
//    sichtbar — eine Schuld stillschweigend auszublenden, weil ein Feld leer
//    ist, wäre beim Geld die falsche Richtung.
// =============================================================================

import { effectiveCategoryOf } from './selectors.js'
import { SAVINGS_CATEGORY } from './categories.js'

export const EMPTY_FILTER = {
  person: 'all',
  accountId: 'all',
  kind: 'all',
  category: 'all',
  search: '',
}

export const KIND_OPTIONS = [
  { id: 'all', label: 'Alles' },
  { id: 'fixed', label: 'Fixkosten' },
  { id: 'subscription', label: 'Abos' },
  { id: 'savings', label: 'Sparen' },
  { id: 'debt', label: 'Schulden' },
]

// Vollständiger Filter aus einem möglicherweise unvollständigen Objekt.
export function normalizeFilter(filter) {
  return { ...EMPTY_FILTER, ...(filter || {}) }
}

export function isEmptyFilter(filter) {
  const f = normalizeFilter(filter)
  return (
    f.person === 'all' &&
    f.accountId === 'all' &&
    f.kind === 'all' &&
    f.category === 'all' &&
    !f.search.trim()
  )
}

// Wie viele Bedingungen sind gesetzt? Für die Zahl am „Filter"-Knopf am Handy.
export function activeFilterCount(filter) {
  const f = normalizeFilter(filter)
  let n = 0
  if (f.person !== 'all') n++
  if (f.accountId !== 'all') n++
  if (f.kind !== 'all') n++
  if (f.category !== 'all') n++
  if (f.search.trim()) n++
  return n
}

// Kurzfassung des Filters für die schmale Leiste am Handy.
export function filterSummary(filter, data = {}) {
  const f = normalizeFilter(filter)
  const parts = []
  if (f.person !== 'all') parts.push(f.person)
  if (f.kind !== 'all') parts.push(KIND_OPTIONS.find((k) => k.id === f.kind)?.label || f.kind)
  if (f.accountId !== 'all') {
    parts.push((data.accounts || []).find((a) => a.id === f.accountId)?.name || 'Konto')
  }
  if (f.category !== 'all') parts.push(f.category)
  if (f.search.trim()) parts.push(`„${f.search.trim()}"`)
  return parts.join(' · ')
}

// --- Einzelne Prüfungen ------------------------------------------------------

// Die Aufteilung liegt je nach Seite in zwei Formen vor: als `split`-Objekt
// (Datenform) oder flach als splitMode/splitPerson/splitShares (Formularform
// in Kosten & Abos). Beides hier einsammeln, damit der Filter überall gleich
// entscheidet.
function splitOf(order) {
  if (order.split) return order.split
  return { mode: order.splitMode || 'even', person: order.splitPerson, shares: order.splitShares }
}

// Trägt die Person den Posten mit? 'single' nur sie, sonst anteilig.
function personInvolved(order, person) {
  const split = splitOf(order)
  if (split.mode === 'single') return split.person === person
  if (split.mode === 'amount' || split.mode === 'percent') {
    return Number(split.shares?.[person] || 0) > 0
  }
  return true // 'even': alle tragen mit
}

// Art eines Postens: Sparen schlägt Fixkosten/Abo, weil es über die Kategorie
// bestimmt wird (siehe isSavings in recurring.js).
function kindOfOrder(order, overrides) {
  if (effectiveCategoryOf(order, overrides) === SAVINGS_CATEGORY || order.kind === 'savings') {
    return 'savings'
  }
  return order.kind === 'subscription' ? 'subscription' : 'fixed'
}

function matchesText(haystacks, needle) {
  const q = needle.trim().toLowerCase()
  if (!q) return true
  return haystacks.some((h) => (h || '').toLowerCase().includes(q))
}

// Passt ein Fixkosten-/Abo-/Sparposten zum Filter? Nimmt beide Datenformen.
export function orderMatches(order, filter, overrides = {}) {
  const f = normalizeFilter(filter)
  if (f.kind === 'debt') return false
  if (f.kind !== 'all' && kindOfOrder(order, overrides) !== f.kind) return false
  if (f.accountId !== 'all' && order.accountId !== f.accountId) return false
  if (f.category !== 'all' && effectiveCategoryOf(order, overrides) !== f.category) return false
  if (f.person !== 'all' && !personInvolved(order, f.person)) return false
  if (!matchesText([order.recipient, order.description], f.search)) return false
  return true
}

// Passt eine Schuld zum Filter? Person über den Kontoinhaber, siehe Kopf.
export function debtMatches(debt, filter, accounts = []) {
  const f = normalizeFilter(filter)
  if (f.kind !== 'all' && f.kind !== 'debt') return false
  if (f.category !== 'all') return false // Schulden haben keine Kategorie
  if (f.accountId !== 'all' && debt.accountId !== f.accountId) return false
  if (f.person !== 'all') {
    const acc = accounts.find((a) => a.id === debt.accountId)
    if (acc && acc.type === 'personal' && (acc.owner || acc.name) !== f.person) return false
  }
  if (!matchesText([debt.name, debt.creditor], f.search)) return false
  return true
}

// Passt eine Einnahme zum Filter? Die Art („Abos", „Fixkosten") beschreibt
// Kosten, nicht Einnahmen – deshalb wirken hier nur Person und Konto. Ohne das
// stünden gefilterte Kosten gegen das volle Einkommen und der Überschuss wäre
// falsch.
export function incomeMatches(income, filter, accounts = []) {
  const f = normalizeFilter(filter)
  if (f.accountId !== 'all' && income.accountId !== f.accountId) return false
  if (f.person !== 'all') {
    const acc = accounts.find((a) => a.id === income.accountId)
    if (acc && acc.type === 'personal' && (acc.owner || acc.name) !== f.person) return false
  }
  return true
}

// Passt eine Umbuchung zum Filter? Eine Umbuchung ist keine der Arten — bei
// jeder gewählten Art fällt sie also weg. Die Person bleibt hier offen, weil
// accountFlows sie über das Herkunftskonto entscheidet (eine Regel, eine
// Stelle).
export function transferMatches(transfer, filter) {
  const f = normalizeFilter(filter)
  if (f.kind !== 'all') return false
  if (f.category !== 'all') return false
  if (f.accountId !== 'all' &&
      transfer.fromAccountId !== f.accountId && transfer.toAccountId !== f.accountId) return false
  if (!matchesText([transfer.label], f.search)) return false
  return true
}

// --- Angewandt auf den ganzen Datensatz --------------------------------------

export function applyFilter(data, filter, overrides = {}) {
  if (!data || isEmptyFilter(filter)) return data
  const accounts = data.accounts || []
  return {
    ...data,
    standingOrders: (data.standingOrders || []).filter((o) => orderMatches(o, filter, overrides)),
    debts: (data.debts || []).filter((d) => debtMatches(d, filter, accounts)),
    incomes: (data.incomes || []).filter((i) => incomeMatches(i, filter, accounts)),
    transfers: (data.transfers || []).filter((t) => transferMatches(t, filter)),
  }
}
