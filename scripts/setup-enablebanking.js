#!/usr/bin/env node
// =============================================================================
//  scripts/setup-enablebanking.js — geführte Einrichtung der C24-Verknüpfung
// =============================================================================
//  Drei Schritte (Voraussetzung: .env mit ENABLEBANKING_APP_ID/KEY_PATH):
//
//    1) node scripts/setup-enablebanking.js aspsps
//         -> findet die C24-Bank (ASPSP) und ihren exakten Namen
//
//    2) node scripts/setup-enablebanking.js link "<aspspName>"
//         -> startet die Autorisierung und gibt einen Login-Link aus.
//            Link im Browser öffnen, bei C24 bestätigen; danach landest du
//            auf der Redirect-URL mit ?code=... in der Adresszeile.
//
//    3) node scripts/setup-enablebanking.js session <code>
//         -> tauscht den code gegen eine Session und listet die Konto-UIDs
//            (+ IBANs) für config.js
// =============================================================================

import { randomUUID } from 'node:crypto'
import { api, REDIRECT_URL } from './eb-lib.js'

const [, , cmd, arg] = process.argv

async function aspsps() {
  const list = await api('/aspsps?country=DE')
  const all = list.aspsps || list || []
  const c24 = all.filter((a) => /c24|24\s*bank/i.test(a.name || ''))
  if (c24.length) {
    console.log('Gefundene C24-Bank(en):')
    c24.forEach((a) => console.log(`  "${a.name}"   (${a.country})`))
    console.log('\nNächster Schritt:')
    console.log(`  node scripts/setup-enablebanking.js link "${c24[0].name}"`)
  } else {
    console.log('Keine C24 gefunden. Komplette Liste (suche deine Bank):')
    all.forEach((a) => console.log(`  "${a.name}"   (${a.country})`))
  }
}

async function link(aspspName) {
  if (!aspspName) {
    console.error('Bitte Bank-Namen angeben: node scripts/setup-enablebanking.js link "<aspspName>"')
    process.exit(1)
  }
  // Zugriff bis 90 Tage in der Zukunft (PSD2-Maximum für die meisten Banken).
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const res = await api('/auth', {
    method: 'POST',
    body: JSON.stringify({
      access: { valid_until: validUntil },
      aspsp: { name: aspspName, country: 'DE' },
      state: randomUUID(),
      redirect_url: REDIRECT_URL,
      psu_type: 'personal',
    }),
  })
  console.log('✅ Autorisierung gestartet.')
  console.log('\n1) Öffne diesen Link im Browser und logge dich bei C24 ein:\n')
  console.log(`   ${res.url}\n`)
  console.log('2) Danach landest du auf der Redirect-Seite. Kopiere den Wert von')
  console.log('   "code" aus der Adresszeile (…?code=XXXX&state=…) und führe aus:\n')
  console.log('   node scripts/setup-enablebanking.js session <code>\n')
}

async function session(code) {
  if (!code) {
    console.error('Bitte code angeben: node scripts/setup-enablebanking.js session <code>')
    process.exit(1)
  }
  const res = await api('/sessions', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  console.log('✅ Session angelegt.')
  console.log(`   session_id: ${res.session_id}`)
  const accounts = res.accounts || []
  if (!accounts.length) {
    console.log('Noch keine Konten verknüpft.')
    return
  }
  console.log('\nVerknüpfte Konten (UID  →  IBAN / Name):\n')
  for (const acc of accounts) {
    // Enable Banking liefert je nach Version UID-Strings oder Objekte mit uid.
    const uid = typeof acc === 'string' ? acc : acc.uid
    let info = ''
    if (typeof acc === 'object') {
      info = acc.account_id?.iban || acc.name || acc.product || ''
    }
    if (!info) {
      try {
        const d = await api(`/accounts/${uid}/details`)
        const det = d.account || d
        info = det.account_id?.iban || det.name || det.product || ''
      } catch {
        /* Detail evtl. (noch) nicht abrufbar */
      }
    }
    console.log(`  ${uid}   ${info}`)
  }
  console.log('\nTrage diese UIDs in config.js bei "enableBankingAccountUid" ein')
  console.log('(joint = Gemeinschaftskonto, p1/p2 = Privatkonten) und starte dann:')
  console.log('  npm run fetch-data')
}

const cmds = { aspsps, link, session }
const run = cmds[cmd]
if (!run) {
  console.log('Befehle:')
  console.log('  node scripts/setup-enablebanking.js aspsps')
  console.log('  node scripts/setup-enablebanking.js link "<aspspName>"')
  console.log('  node scripts/setup-enablebanking.js session <code>')
  process.exit(0)
}
run(arg).catch((err) => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
