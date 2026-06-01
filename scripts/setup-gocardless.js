#!/usr/bin/env node
// =============================================================================
//  scripts/setup-gocardless.js — geführte Einrichtung der C24-Verknüpfung
// =============================================================================
//  Drei Schritte (Voraussetzung: .env mit GOCARDLESS_SECRET_ID/KEY):
//
//    1) node scripts/setup-gocardless.js institutions
//         -> findet die C24-Institution-ID
//
//    2) node scripts/setup-gocardless.js link <institutionId>
//         -> legt die Verknüpfung an und gibt einen Login-Link aus.
//            Link im Browser öffnen und bei C24 bestätigen.
//
//    3) node scripts/setup-gocardless.js accounts <requisitionId>
//         -> listet die verknüpften Konto-IDs + IBANs für config.js
// =============================================================================

import { api, getToken } from './gc-lib.js'

const [, , cmd, arg] = process.argv

async function institutions() {
  const token = await getToken()
  const list = await api('/institutions/?country=de', token)
  const c24 = list.filter((i) => /c24|24\s*bank/i.test(i.name))
  if (c24.length) {
    console.log('Gefundene C24-Institution(en):')
    c24.forEach((i) => console.log(`  ${i.id}   ${i.name}`))
    console.log('\nNächster Schritt:')
    console.log(`  node scripts/setup-gocardless.js link ${c24[0].id}`)
  } else {
    console.log('Keine C24 gefunden. Komplette Liste (suche deine Bank):')
    list.forEach((i) => console.log(`  ${i.id}   ${i.name}`))
  }
}

async function link(institutionId) {
  if (!institutionId) {
    console.error('Bitte Institution-ID angeben: node scripts/setup-gocardless.js link <institutionId>')
    process.exit(1)
  }
  const token = await getToken()
  const req = await api('/requisitions/', token, {
    method: 'POST',
    body: JSON.stringify({
      institution_id: institutionId,
      redirect: 'https://dankeyking.github.io/privatefinance/',
      reference: `privatefinance-${Date.now()}`,
      user_language: 'DE',
    }),
  })
  console.log('✅ Verknüpfung angelegt.')
  console.log('\n1) Öffne diesen Link im Browser und logge dich bei C24 ein:\n')
  console.log(`   ${req.link}\n`)
  console.log('2) Danach die Konten auslesen mit:\n')
  console.log(`   node scripts/setup-gocardless.js accounts ${req.id}\n`)
}

async function accounts(reqId) {
  if (!reqId) {
    console.error('Bitte Requisition-ID angeben: node scripts/setup-gocardless.js accounts <requisitionId>')
    process.exit(1)
  }
  const token = await getToken()
  const req = await api(`/requisitions/${reqId}/`, token)
  if (req.status !== 'LN') {
    console.log(`ℹ Status: ${req.status} – Verknüpfung noch nicht abgeschlossen.`)
    console.log('  Bitte zuerst den Login-Link im Browser bestätigen, dann erneut ausführen.\n')
  }
  if (!req.accounts || req.accounts.length === 0) {
    console.log('Noch keine Konten verknüpft.')
    return
  }
  console.log('Verknüpfte Konten (ID  →  IBAN / Name):\n')
  for (const id of req.accounts) {
    let info = ''
    try {
      const d = await api(`/accounts/${id}/`, token)
      info = d.iban || d.name || ''
    } catch {
      /* Detail evtl. (noch) nicht abrufbar */
    }
    console.log(`  ${id}   ${info}`)
  }
  console.log('\nTrage diese IDs in config.js bei "gocardlessAccountId" ein')
  console.log('(joint = Gemeinschaftskonto, p1/p2 = Privatkonten) und starte dann:')
  console.log('  npm run fetch-data')
}

const cmds = { institutions, link, accounts }
const run = cmds[cmd]
if (!run) {
  console.log('Befehle:')
  console.log('  node scripts/setup-gocardless.js institutions')
  console.log('  node scripts/setup-gocardless.js link <institutionId>')
  console.log('  node scripts/setup-gocardless.js accounts <requisitionId>')
  process.exit(0)
}
run(arg).catch((err) => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
