// =============================================================================
//  mockData.js — realistische Demo-Daten (Fallback, wenn keine public/data.json)
// =============================================================================
//  Erzeugt Konten, Daueraufträge, ~6 Monate Transaktionen + Saldoverlauf.
//  Interne Umbuchungen (Gehalt-Übertrag aufs Taschengeld) sind mit internal=true
//  markiert und zählen nicht als Einnahme/Ausgabe in den KPIs.
// =============================================================================

import { autoCategorize } from '../lib/categories.js'

// --- Konten ------------------------------------------------------------------
const accounts = [
  { id: 'joint', name: 'Gemeinschaftskonto', type: 'joint', owner: 'Duncan & Partner', iban: 'DE12 5001 0517 0648 4898 90', balance: 4200.5, currency: 'EUR' },
  { id: 'p1', name: 'Privatkonto Duncan', type: 'personal', owner: 'Duncan', iban: 'DE91 1000 0000 0123 4567 89', balance: 1850.0, currency: 'EUR' },
  { id: 'p2', name: 'Privatkonto Partner', type: 'personal', owner: 'Partner', iban: 'DE89 3704 0044 0532 0130 00', balance: 1620.0, currency: 'EUR' },
]

// --- Daueraufträge -----------------------------------------------------------
// Mehrere laufen bewusst noch über Privatkonten (p1/p2) = Umstell-Kandidaten.
// executionDay = Tag im Monat, an dem die Buchung/Lastschrift läuft (für den
// Zahlungslauf/Timing-Check wichtig).
const standingOrders = [
  { id: 'so1', recipient: 'Vermieter Müller', amount: 1450, rhythm: 'monthly', accountId: 'joint', category: 'Wohnen', monthInterval: 1, executionDay: 1 },
  { id: 'so2', recipient: 'Stadtwerke Strom', amount: 95, rhythm: 'monthly', accountId: 'joint', category: 'Wohnen', monthInterval: 1, executionDay: 18 },
  { id: 'so3', recipient: 'Trade Republic Sparplan', amount: 300, rhythm: 'monthly', accountId: 'joint', category: 'Sparen', monthInterval: 1, executionDay: 5 },
  { id: 'so4', recipient: 'Comdirect ETF Sparplan', amount: 200, rhythm: 'monthly', accountId: 'joint', category: 'Sparen', monthInterval: 1, executionDay: 5 },
  { id: 'so5', recipient: 'HUK Hausratversicherung', amount: 180, rhythm: 'yearly', accountId: 'joint', category: 'Versicherung', monthInterval: 12, executionDay: 25 },
  // --- noch über Privatkonto (sollten ggf. aufs Gemeinschaftskonto) ---
  { id: 'so6', recipient: 'Telekom Internet', amount: 49.99, rhythm: 'monthly', accountId: 'p1', category: 'Wohnen', monthInterval: 1, executionDay: 12 },
  { id: 'so7', recipient: 'Stadtwerke Wasser', amount: 165, rhythm: 'quarterly', accountId: 'p1', category: 'Wohnen', monthInterval: 3, executionDay: 8 },
  { id: 'so8', recipient: 'Allianz KFZ-Versicherung', amount: 720, rhythm: 'yearly', accountId: 'p1', category: 'Versicherung', monthInterval: 12, executionDay: 15 },
  { id: 'so9', recipient: 'Netflix', amount: 17.99, rhythm: 'monthly', accountId: 'p1', category: 'Freizeit', monthInterval: 1, executionDay: 20 },
  { id: 'so10', recipient: 'McFit Fitnessstudio', amount: 29.99, rhythm: 'monthly', accountId: 'p2', category: 'Freizeit', monthInterval: 1, executionDay: 1 },
  { id: 'so11', recipient: 'Spotify', amount: 10.99, rhythm: 'monthly', accountId: 'p2', category: 'Freizeit', monthInterval: 1, executionDay: 6 },
]

// --- Wiederkehrende Überträge Privatkonto -> Gemeinschaftskonto (Daueraufträge) -
// Haushaltsbeiträge, mit denen das Gemeinschaftskonto die Fixkosten deckt.
const transfers = [
  { id: 'tr1', recipient: 'Haushaltsbeitrag Duncan', amount: 1800, rhythm: 'monthly', fromAccountId: 'p1', toAccountId: 'joint', executionDay: 5 },
  { id: 'tr2', recipient: 'Haushaltsbeitrag Partner', amount: 1600, rhythm: 'monthly', fromAccountId: 'p2', toAccountId: 'joint', executionDay: 15 },
]

// --- Hilfen ------------------------------------------------------------------
// Lokales YYYY-MM-DD (kein toISOString, das in nicht-UTC-Zonen den Tag verschiebt).
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Liste der letzten `count` Monate (ältester zuerst), jeweils als Date am 1.
function lastMonths(count, anchor = new Date()) {
  const out = []
  for (let i = count - 1; i >= 0; i--) {
    out.push(new Date(anchor.getFullYear(), anchor.getMonth() - i, 1))
  }
  return out
}

// Nächstes Ausführungsdatum eines Dauerauftrags ab heute (auf executionDay).
function nextExecutionDate(executionDay, monthInterval, anchor = new Date()) {
  const day = executionDay || 1
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), day)
  if (d <= anchor) d.setMonth(d.getMonth() + 1)
  // bei quartals-/jährlichen Aufträgen ein paar Monate nach vorne staffeln
  if (monthInterval === 3) d.setMonth(d.getMonth() + 1)
  if (monthInterval === 12) d.setMonth(d.getMonth() + 3)
  return isoDate(d)
}

// --- Transaktionen + Saldoverlauf generieren ---------------------------------
function generate() {
  const today = new Date()
  const months = lastMonths(6, today)
  const transactions = []
  let counter = 0
  const txId = () => `t${++counter}`

  // Wiederkehrende variable Ausgaben (kein Dauerauftrag, aber jeden Monat da)
  const variableExpenses = [
    { recipient: 'REWE', accountId: 'joint', base: 320, jitter: 60 },
    { recipient: 'Edeka', accountId: 'joint', base: 180, jitter: 50 },
    { recipient: 'Aral Tankstelle', accountId: 'p1', base: 70, jitter: 25 },
    { recipient: 'Restaurant Bella Italia', accountId: 'p2', base: 55, jitter: 30 },
    { recipient: 'dm Drogerie', accountId: 'joint', base: 45, jitter: 15 },
  ]

  months.forEach((m, idx) => {
    const y = m.getFullYear()
    const mon = m.getMonth()
    const day = (n) => isoDate(new Date(y, mon, n))

    // Einnahmen (Gehälter) -> Privatkonten
    transactions.push({ id: txId(), accountId: 'p1', date: day(1), amount: 3200, recipient: 'Arbeitgeber Duncan', description: 'Gehalt', category: null, internal: false })
    transactions.push({ id: txId(), accountId: 'p2', date: day(1), amount: 2800, recipient: 'Arbeitgeber Partner', description: 'Gehalt', category: null, internal: false })

    // Interne Überträge Privatkonto -> Gemeinschaftskonto (Beitrag zu den Fixkosten),
    // an den Ausführungstagen der Beitrags-Daueraufträge (tr1: 5., tr2: 15.).
    transactions.push({ id: txId(), accountId: 'p1', date: day(5), amount: -1800, recipient: 'Übertrag ans Gemeinschaftskonto', description: 'Haushaltsbeitrag', category: null, internal: true, toAccountId: 'joint' })
    transactions.push({ id: txId(), accountId: 'joint', date: day(5), amount: 1800, recipient: 'Beitrag Duncan', description: 'Haushaltsbeitrag', category: null, internal: true, fromAccountId: 'p1' })
    transactions.push({ id: txId(), accountId: 'p2', date: day(15), amount: -1600, recipient: 'Übertrag ans Gemeinschaftskonto', description: 'Haushaltsbeitrag', category: null, internal: true, toAccountId: 'joint' })
    transactions.push({ id: txId(), accountId: 'joint', date: day(15), amount: 1600, recipient: 'Beitrag Partner', description: 'Haushaltsbeitrag', category: null, internal: true, fromAccountId: 'p2' })

    // Daueraufträge als Buchung, sofern in diesem Monat fällig.
    // Der jüngste Monat ist immer fällig; quartals-/jährliche entsprechend gestaffelt.
    standingOrders.forEach((so) => {
      const due = (months.length - 1 - idx) % so.monthInterval === 0
      if (!due) return
      transactions.push({
        id: txId(),
        accountId: so.accountId,
        date: day(so.executionDay || 3),
        amount: -Math.abs(so.amount),
        recipient: so.recipient,
        description: 'Dauerauftrag',
        category: so.category,
        internal: false,
      })
    })

    // variable Ausgaben
    variableExpenses.forEach((ve, i) => {
      const amount = -(ve.base + Math.round((Math.sin(idx * 3 + i) * ve.jitter)))
      transactions.push({
        id: txId(),
        accountId: ve.accountId,
        date: day(10 + i),
        amount,
        recipient: ve.recipient,
        description: 'Einkauf',
        category: autoCategorize(ve.recipient),
        internal: false,
      })
    })

    // Bargeldabhebungen (zum Aufteilen / Zuordnen auf der Bargeld-Seite)
    transactions.push({ id: txId(), accountId: 'p1', date: day(7), amount: -200, recipient: 'Bargeldabhebung', description: 'Geldautomat', category: 'Bargeld', internal: false, cashWithdrawal: true })
    transactions.push({ id: txId(), accountId: 'joint', date: day(22), amount: -150, recipient: 'Bargeldabhebung', description: 'Geldautomat', category: 'Bargeld', internal: false, cashWithdrawal: true })
  })

  // Saldoverlauf: plausibler, leicht steigender Trend, der im jüngsten Monat
  // exakt im heutigen Saldo endet (für ein sauberes Linien-Chart).
  const balanceHistory = []
  const monthKeys = months.map((m) => monthKey(m))
  const monthlyDelta = { joint: 180, p1: 55, p2: 40 } // typischer Zuwachs/Monat
  monthKeys.forEach((k, i) => {
    const stepsBack = monthKeys.length - 1 - i
    const point = { date: `${k}-01` }
    accounts.forEach((a) => {
      const delta = monthlyDelta[a.id] ?? 50
      const noise = Math.round(Math.sin(i * 2 + a.id.length) * 30)
      point[a.id] = Number((a.balance - stepsBack * delta + noise).toFixed(2))
    })
    balanceHistory.push(point)
  })

  // monthInterval ist nur intern für die Generierung; alle anderen Felder
  // (inkl. executionDay) bleiben erhalten, nextExecution kommt dazu.
  const enrichedOrders = standingOrders.map(({ monthInterval, ...so }) => ({
    ...so,
    nextExecution: nextExecutionDate(so.executionDay, monthInterval, today),
  }))

  const enrichedTransfers = transfers.map((tr) => ({
    ...tr,
    nextExecution: nextExecutionDate(tr.executionDay, 1, today),
  }))

  return {
    accounts,
    standingOrders: enrichedOrders,
    transfers: enrichedTransfers,
    transactions,
    balanceHistory,
  }
}

export const mockData = generate()
export default mockData
