#!/usr/bin/env node
// =============================================================================
//  scripts/fetch-data.js
//  Holt echte C24-Daten über die Enable-Banking Account Information API
//  und schreibt sie nach public/data.json. Wird im Browser wegen CORS NICHT
//  direkt aufgerufen – deshalb dieses kleine Node-Skript.
//
//  Voraussetzungen:
//    1. .env        mit ENABLEBANKING_APP_ID / ENABLEBANKING_KEY_PATH (siehe .env.example)
//    2. config.js   mit den Konto-UIDs deiner Konten (siehe config.example.js)
//    3. C24-Konten via Session verknüpft (siehe README.md, Schritt 3)
//
//  Aufruf:  npm run fetch-data
// =============================================================================

import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { api, ROOT } from './eb-lib.js'

// Erkennt Daueraufträge heuristisch: ausgehende Buchungen, deren Empfänger in
// mehreren Monaten mit ähnlichem Betrag auftaucht. (Die API liefert keine
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
  for (const [, list] of Object.entries(groups)) {
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

function pickBalance(payload) {
  // bevorzugt verfügbares/erwartetes Guthaben (Enable-Banking balance_type-Codes)
  const arr = payload?.balances || []
  const pref =
    arr.find((b) => /ITAV|CLBD|XPCD|interimAvailable|closingBooked/i.test(b.balance_type)) || arr[0]
  return pref ? Number(pref.balance_amount.amount) : 0
}

function normalizeTx(list, accountId) {
  const out = []
  for (const t of list || []) {
    // Enable Banking liefert immer positive Beträge; Vorzeichen aus dem Indikator.
    const sign = t.credit_debit_indicator === 'DBIT' ? -1 : 1
    const amount = Number(t.transaction_amount.amount) * sign
    const counter = sign < 0 ? t.creditor?.name : t.debtor?.name
    const remit = Array.isArray(t.remittance_information)
      ? t.remittance_information.join(' ')
      : t.remittance_information || ''
    out.push({
      id: t.entry_reference || t.transaction_id || `${accountId}-${t.booking_date}-${Math.random()}`,
      accountId,
      date: t.booking_date || t.value_date,
      amount,
      recipient: counter || remit || 'Unbekannt',
      description: remit.slice(0, 120),
      category: null,
      internal: false,
    })
  }
  return out
}

// Holt alle Transaktionen eines Kontos (paginiert über continuation_key).
async function fetchTransactions(uid, dateFrom) {
  let all = []
  let cont = null
  do {
    const q = new URLSearchParams({ date_from: dateFrom })
    if (cont) q.set('continuation_key', cont)
    const page = await api(`/accounts/${uid}/transactions?${q}`)
    all = all.concat(page.transactions || [])
    cont = page.continuation_key || null
  } while (cont)
  return all
}

async function main() {
  // config.js laden (Konto-Zuordnung)
  const configPath = join(ROOT, 'config.js')
  if (!existsSync(configPath)) {
    console.error('❌ config.js fehlt. Kopiere config.example.js -> config.js und trage die Konto-UIDs ein.')
    process.exit(1)
  }
  const { ACCOUNTS } = await import(`file://${configPath}`)

  // Transaktionen ab 90 Tage rückwärts (PSD2-typisches Maximum ohne Re-Login).
  const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const accounts = []
  let allTx = []

  for (const acc of ACCOUNTS) {
    const uid = acc.enableBankingAccountUid
    if (!uid || uid.startsWith('REPLACE_ME')) {
      console.warn(`⚠ ${acc.name}: keine enableBankingAccountUid gesetzt – übersprungen.`)
      continue
    }
    console.log(`→ ${acc.name}: Salden + Transaktionen …`)
    const balances = await api(`/accounts/${uid}/balances`)
    const txRaw = await fetchTransactions(uid, dateFrom)
    const balance = pickBalance(balances)
    accounts.push({ id: acc.id, name: acc.name, type: acc.type, owner: acc.owner, balance, currency: 'EUR' })
    allTx = allTx.concat(normalizeTx(txRaw, acc.id))
  }

  if (!accounts.length) {
    console.error('❌ Keine Konten abgerufen. Prüfe config.js und die Session (README Schritt 3).')
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
