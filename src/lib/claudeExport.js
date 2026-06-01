// =============================================================================
//  claudeExport.js — Analyse-fertiger JSON-Export für Claude
// =============================================================================
//  Erzeugt ein strukturiertes JSON, das Duncan direkt an Claude geben kann.
//  Kernidee: markieren, welche Daueraufträge noch übers Privatkonto laufen
//  (runsOnJoint=false) und Claude um eine Umstell-Empfehlung bitten.
// =============================================================================

import { toMonthly } from './normalize.js'
import { effectiveCategory } from './storage.js'

const TASK_PROMPT =
  'Analysiere diesen Haushalts-Cashflow. Das Modell: Die Gehälter gehen auf die ' +
  'Privatkonten; von dort überweist jede Person einen Beitrag aufs Gemeinschaftskonto, ' +
  'das die gemeinsamen Fixkosten zahlt. Einige gemeinsame Kosten laufen aber noch direkt ' +
  'über ein Privatkonto statt über das Gemeinschaftskonto. ' +
  'Sage mir konkret: (1) Welche dieser Daueraufträge sollten vom Privatkonto auf das ' +
  'Gemeinschaftskonto umgestellt werden und warum? (2) In welcher Reihenfolge ist die ' +
  'Umstellung am sinnvollsten (z. B. nach monatlicher Höhe oder nächstem Ausführungsdatum)? ' +
  '(3) Gibt es Aufträge, die bewusst privat bleiben sollten? (4) Passt die Höhe der ' +
  'Haushaltsbeiträge zu den Fixkosten auf dem Gemeinschaftskonto? Berücksichtige die ' +
  'normalisierten Monatskosten (monthlyCost). Die Liste "summary.ordersNotOnJoint" enthält ' +
  'die Umstell-Kandidaten – nutze das Feld "empfehlung" für deine Einschätzung.'

// Baut das Export-Objekt. Erwartet die rohen Daten + die aktiven Overrides.
export function buildClaudeExport(data, overrides = {}) {
  const accounts = data.accounts || []
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]))

  const standingOrders = (data.standingOrders || []).map((so) => {
    const account = accountById[so.accountId]
    const sourceAccountType = account ? account.type : 'unknown'
    const runsOnJoint = sourceAccountType === 'joint'
    const monthlyCost = Number(toMonthly(so.amount, so.rhythm).toFixed(2))
    return {
      id: so.id,
      recipient: so.recipient,
      amount: so.amount,
      rhythm: so.rhythm,
      nextExecution: so.nextExecution,
      accountId: so.accountId,
      accountName: account ? account.name : so.accountId,
      sourceAccountType,
      runsOnJoint,
      category: effectiveCategory(so, overrides),
      monthlyCost,
    }
  })

  const totalMonthlyOnJoint = Number(
    standingOrders
      .filter((s) => s.runsOnJoint)
      .reduce((sum, s) => sum + s.monthlyCost, 0)
      .toFixed(2),
  )
  const totalMonthlyOnPersonal = Number(
    standingOrders
      .filter((s) => !s.runsOnJoint)
      .reduce((sum, s) => sum + s.monthlyCost, 0)
      .toFixed(2),
  )

  // Umstell-Kandidaten: laufen nicht übers Gemeinschaftskonto.
  // Nach monatlicher Höhe absteigend sortiert (größter Hebel zuerst).
  const ordersNotOnJoint = standingOrders
    .filter((s) => !s.runsOnJoint)
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .map((s) => ({
      recipient: s.recipient,
      category: s.category,
      accountName: s.accountName,
      rhythm: s.rhythm,
      amount: s.amount,
      monthlyCost: s.monthlyCost,
      nextExecution: s.nextExecution,
      empfehlung: '', // von Claude auszufüllen
    }))

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      currency: 'EUR',
      app: 'PrivateFinance',
    },
    task: TASK_PROMPT,
    householdModel: {
      description:
        'Gehälter -> Privatkonten -> Haushaltsbeitrag aufs Gemeinschaftskonto -> gemeinsame Fixkosten. ' +
        'Einzelne Kosten werden noch direkt vom Privatkonto gezahlt.',
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        owner: a.owner,
        balance: a.balance,
      })),
    },
    standingOrders,
    summary: {
      totalMonthlyOnJoint,
      totalMonthlyOnPersonal,
      countNotOnJoint: ordersNotOnJoint.length,
      ordersNotOnJoint,
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
