#!/usr/bin/env node
// =============================================================================
//  scripts/fetch-data.js
//  Holt echte C24-Daten über die GoCardless (Nordigen) Bank Account Data API
//  und schreibt sie nach public/data.json. Wird im Browser wegen CORS NICHT
//  direkt aufgerufen – deshalb dieses kleine Node-Skript.
//
//  Voraussetzungen:
//    1. .env        mit GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY (siehe .env.example)
//    2. config.js   mit den Account-IDs deiner Konten (siehe config.example.js)
//    3. C24-Konten via Requisition verknüpft (siehe README.md, Schritt 3)
//
//  Aufruf:  npm run fetch-data
// =============================================================================

import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { api, getToken, ROOT } from './gc-lib.js'

// Erkennt Daueraufträge heuristisch: ausgehende Buchungen, deren Empfänger in
// mehreren Monaten mit ähnlichem Betrag auftaucht. (GoCardless v2 liefert keine
// expliziten Standing Orders.) Du kannst die Liste danach manuell verfeinern.
function detectStandingOrders(transactions) {
  const groups = {}
  for (const t of transactions) {
    if (t.amount >= 0) continue
    const key = (t.recipient || '').toLowerCase().trim()
    if (!key) continue
    groups[key] = groups[key] || []
    groups[key].push(t)
  }
  const orders = []
  let i = 0
  for (const [key, list] of Object.entries(groups)) {
    const months = new Set(list.map((t) => t.date.slice(0, 7)))
    if (months.size < 2) continue // nur wiederkehrende
    const amount = Math.abs(list[0].amount)
    orders.push({
      id: `det${++i}`,
      recipient: list[0].recipient,
      amount,
      rhythm: 'monthly',
      accountId: list[0].accountId,
      category: list[0].category || null,
      nextExecution: null,
    })
  }
  return orders
}

function pickBalance(balances) {
  // bevorzugt verfügbares/erwartetes Guthaben
  const arr = balances?.balances || []
  const pref = arr.find((b) => /interimAvailable|expected|closingBooked/i.test(b.balanceType)) || arr[0]
  return pref ? Number(pref.balanceAmount.amount) : 0
}

function normalizeTx(raw, accountId) {
  const out = []
  const booked = raw?.transactions?.booked || []
  for (const t of booked) {
    out.push({
      id: t.transactionId || t.internalTransactionId || `${accountId}-${t.bookingDate}-${Math.random()}`,
      accountId,
      date: t.bookingDate || t.valueDate,
      amount: Number(t.transactionAmount.amount),
      recipient: t.creditorName || t.debtorName || t.remittanceInformationUnstructured || 'Unbekannt',
      description: (t.remittanceInformationUnstructured || '').slice(0, 120),
      category: null,
      internal: false,
    })
  }
  return out
}

async function main() {
  // config.js laden (Account-Zuordnung)
  const configPath = join(ROOT, 'config.js')
  if (!existsSync(configPath)) {
    console.error('❌ config.js fehlt. Kopiere config.example.js -> config.js und trage die Account-IDs ein.')
    process.exit(1)
  }
  const { ACCOUNTS } = await import(`file://${configPath}`)

  console.log('→ Token anfordern …')
  const token = await getToken()

  const accounts = []
  let allTx = []

  for (const acc of ACCOUNTS) {
    const gcId = acc.gocardlessAccountId
    if (!gcId || gcId.startsWith('REPLACE_ME')) {
      console.warn(`⚠ ${acc.name}: keine gocardlessAccountId gesetzt – übersprungen.`)
      continue
    }
    console.log(`→ ${acc.name}: Salden + Transaktionen …`)
    const balances = await api(`/accounts/${gcId}/balances/`, token)
    const txRaw = await api(`/accounts/${gcId}/transactions/`, token)
    const balance = pickBalance(balances)
    accounts.push({ id: acc.id, name: acc.name, type: acc.type, owner: acc.owner, balance, currency: 'EUR' })
    allTx = allTx.concat(normalizeTx(txRaw, acc.id))
  }

  if (!accounts.length) {
    console.error('❌ Keine Konten abgerufen. Prüfe config.js und die Requisition (README Schritt 3).')
    process.exit(1)
  }

  // Saldoverlauf je Monat rückwärts aus den Transaktionen ableiten
  const months = [...new Set(allTx.map((t) => t.date.slice(0, 7)))].sort()
  const running = Object.fromEntries(accounts.map((a) => [a.id, a.balance]))
  const balanceHistory = []
  const nettoByMonth = {}
  for (const t of allTx) {
    const k = t.date.slice(0, 7)
    nettoByMonth[k] = nettoByMonth[k] || {}
    nettoByMonth[k][t.accountId] = (nettoByMonth[k][t.accountId] || 0) + t.amount
  }
  for (let idx = months.length - 1; idx >= 0; idx--) {
    const k = months[idx]
    const point = { date: `${k}-01` }
    for (const a of accounts) point[a.id] = Number(running[a.id].toFixed(2))
    balanceHistory.unshift(point)
    for (const a of accounts) running[a.id] -= nettoByMonth[k]?.[a.id] || 0
  }

  const standingOrders = detectStandingOrders(allTx)

  const out = { accounts, standingOrders, transactions: allTx, balanceHistory }
  const outPath = join(ROOT, 'public', 'data.json')
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`✅ ${accounts.length} Konten, ${allTx.length} Transaktionen -> public/data.json`)
  console.log('   Starte/aktualisiere die App mit: npm run dev')
}

main().catch((err) => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
