// =============================================================================
//  timing.js — Zahlungslauf / Timing-Check (nur aus Daueraufträgen)
// =============================================================================
//  Prüft die Kette: Privatkonto -> Beitrag aufs Gemeinschaftskonto ->
//  Lastschrift/Dauerauftrag an den Endempfänger. Frage: Ist das Geld früh
//  genug auf dem Gemeinschaftskonto, bevor die Buchungen abgehen?
//
//  Methode: chronologischer Monatslauf der Gemeinschaftskonto-Bewegungen,
//  laufender Saldo ab 0 €. Geht er negativ, wäre eine Buchung ohne Puffer nicht
//  gedeckt. requiredBuffer = nötiger Mindest-Puffer, damit alles rechtzeitig ist.
// =============================================================================

import { parseLocalDate } from './selectors.js'

const dayOf = (item) =>
  item.executionDay ||
  (item.nextExecution ? parseLocalDate(item.nextExecution).getDate() : 1)

export function buildPaymentSchedule(data) {
  const { accounts = [], standingOrders = [], transfers = [] } = data
  const joint = accounts.find((a) => a.type === 'joint')
  if (!joint) return null
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))

  // Eingänge: Beiträge aufs Gemeinschaftskonto
  const inEvents = transfers
    .filter((t) => t.toAccountId === joint.id)
    .map((t) => ({
      day: dayOf(t),
      kind: 'in',
      amount: Math.abs(t.amount),
      label: t.recipient,
      from: accById[t.fromAccountId]?.name || t.fromAccountId,
      rhythm: t.rhythm || 'monthly',
    }))

  // Ausgänge: Lastschriften/Daueraufträge vom Gemeinschaftskonto
  const outEvents = standingOrders
    .filter((s) => s.accountId === joint.id)
    .map((s) => ({
      day: dayOf(s),
      kind: 'out',
      amount: Math.abs(s.amount),
      label: s.recipient,
      rhythm: s.rhythm,
      category: s.category,
    }))

  // Chronologisch; bei gleichem Tag Eingang vor Ausgang.
  const events = [...inEvents, ...outEvents].sort(
    (a, b) => a.day - b.day || (a.kind === b.kind ? 0 : a.kind === 'in' ? -1 : 1),
  )

  let running = 0
  let minBalance = 0
  events.forEach((e) => {
    running += e.kind === 'in' ? e.amount : -e.amount
    e.balanceAfter = Number(running.toFixed(2))
    if (running < minBalance) minBalance = running
    e.funded = e.kind === 'out' ? running >= 0 : true
  })

  const totalIn = inEvents.reduce((s, e) => s + e.amount, 0)
  const totalOut = outEvents.reduce((s, e) => s + e.amount, 0)
  const requiredBuffer = Math.max(0, -minBalance)
  const jointBalance = joint.balance || 0
  const covered = jointBalance >= requiredBuffer
  const firstRisk = events.find((e) => e.kind === 'out' && !e.funded) || null

  // Tages-Timeline (1..maxDay) für das Chart
  const maxDay = Math.max(28, ...events.map((e) => e.day))
  const timelineLabels = []
  const flowOnly = []
  let r = 0
  let ei = 0
  for (let d = 1; d <= maxDay; d++) {
    while (ei < events.length && events[ei].day === d) {
      r += events[ei].kind === 'in' ? events[ei].amount : -events[ei].amount
      ei++
    }
    timelineLabels.push(d)
    flowOnly.push(Number(r.toFixed(2)))
  }
  const withBuffer = flowOnly.map((v) => Number((v + jointBalance).toFixed(2)))

  return {
    joint,
    events,
    totalIn,
    totalOut,
    minBalance: Number(minBalance.toFixed(2)),
    requiredBuffer: Number(requiredBuffer.toFixed(2)),
    jointBalance,
    covered,
    firstRisk,
    timelineLabels,
    flowOnly,
    withBuffer,
  }
}
