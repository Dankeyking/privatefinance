// =============================================================================
//  orderForm.js — Umwandlung Fixkosten/Abo <-> Formularzeile (inkl. Aufteilung)
// =============================================================================
//  Wird von „Meine Daten" und dem Inline-Editor der Übersicht gemeinsam genutzt.
// =============================================================================

let idc = 0
export const newOrderId = () => `m${Date.now()}${idc++}`

// Betrag robust parsen: akzeptiert deutsches Format ("1.234,56", "9,99 €")
// ebenso wie "9.99". Ungültiges -> 0.
export function parseAmountDE(v) {
  if (typeof v === 'number') return v
  if (v == null) return 0
  let s = String(v).trim().replace(/[^\d.,-]/g, '')
  if (!s) return 0
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function nextExec(day) {
  const t = new Date()
  const d = new Date(t.getFullYear(), t.getMonth(), Number(day) || 1)
  if (d <= t) d.setMonth(d.getMonth() + 1)
  return localISO(d)
}

// Gespeicherter Posten -> Formularzeile.
export function orderToForm(o = {}) {
  const split = o.split || { mode: 'even' }
  return {
    id: o.id || newOrderId(),
    recipient: o.recipient || '',
    amount: o.amount ?? 0,
    rhythm: o.rhythm || 'monthly',
    accountId: o.accountId || '',
    category: o.category || 'Sonstiges',
    kind: o.kind || 'fixed',
    executionDay: o.executionDay || 1,
    endDate: o.endDate || '',
    splitMode: split.mode || 'even',
    splitPerson: split.person || '',
    splitShares: { ...(split.shares || {}) },
  }
}

// Formularzeile -> gespeicherter Posten (normalisiert).
export function formToOrder(o, persons = []) {
  const buildSplit = () => {
    if (o.splitMode === 'single') return { mode: 'single', person: o.splitPerson || persons[0] || '' }
    if (o.splitMode === 'percent' || o.splitMode === 'amount') {
      const shares = {}
      persons.forEach((p) => { shares[p] = parseAmountDE(o.splitShares?.[p]) })
      return { mode: o.splitMode, shares }
    }
    return { mode: 'even' }
  }
  return {
    id: o.id,
    recipient: o.recipient,
    amount: parseAmountDE(o.amount),
    rhythm: o.rhythm,
    accountId: o.accountId,
    category: o.category,
    kind: o.kind === 'subscription' ? 'subscription' : 'fixed',
    executionDay: Number(o.executionDay) || 1,
    endDate: o.endDate || '',
    split: buildSplit(),
    nextExecution: nextExec(o.executionDay),
    monthInterval: o.rhythm === 'yearly' ? 12 : o.rhythm === 'quarterly' ? 3 : 1,
  }
}

// Neue leere Formularzeile.
export function makeNewOrder(kind, accounts = []) {
  const joint = accounts.find((a) => a.type === 'joint')
  return orderToForm({
    id: newOrderId(), recipient: '', amount: 0, rhythm: 'monthly',
    accountId: joint?.id || accounts[0]?.id || '', category: 'Sonstiges', kind, executionDay: 1,
    split: { mode: 'even' },
  })
}
