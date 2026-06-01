// =============================================================================
//  scripts/eb-lib.js — gemeinsame Helfer für die Enable-Banking-Skripte
// =============================================================================
//  Enable Banking (https://enablebanking.com) bietet einen kostenlosen
//  PSD2-/Open-Banking-Zugang für Privatnutzer. Die Authentifizierung läuft
//  über ein selbst signiertes JWT (RS256) mit dem privaten Schlüssel der
//  registrierten Anwendung – wir nutzen dafür nur Node-Bordmittel (crypto),
//  also keine externe Abhängigkeit.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, isAbsolute } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..')

// .env minimal selbst parsen (keine externe Abhängigkeit)
export function loadEnv() {
  const env = { ...process.env }
  const path = join(ROOT, '.env')
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return env
}

export const env = loadEnv()
export const BASE = env.ENABLEBANKING_BASE_URL || 'https://api.enablebanking.com'
export const REDIRECT_URL =
  env.ENABLEBANKING_REDIRECT_URL || 'https://dankeyking.github.io/privatefinance/'

const b64url = (input) => Buffer.from(input).toString('base64url')

// Baut ein RS256-JWT mit dem privaten Schlüssel der Enable-Banking-Anwendung.
export function getJwt() {
  const appId = env.ENABLEBANKING_APP_ID
  const keyPath = env.ENABLEBANKING_KEY_PATH
  if (!appId || appId.includes('deine-app') || !keyPath) {
    console.error(
      '❌ ENABLEBANKING_APP_ID / ENABLEBANKING_KEY_PATH fehlen in .env (siehe .env.example)',
    )
    process.exit(1)
  }
  const absKey = isAbsolute(keyPath) ? keyPath : join(ROOT, keyPath)
  if (!existsSync(absKey)) {
    console.error(`❌ Privater Schlüssel nicht gefunden: ${absKey}`)
    console.error('   Lade die .pem-Datei aus der App-Registrierung herunter und')
    console.error('   trage den Pfad in .env unter ENABLEBANKING_KEY_PATH ein.')
    process.exit(1)
  }
  const privateKey = readFileSync(absKey, 'utf8')

  const now = Math.floor(Date.now() / 1000)
  const header = { typ: 'JWT', alg: 'RS256', kid: appId }
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(privateKey).toString('base64url')
  return `${signingInput}.${signature}`
}

export async function api(path, opts = {}) {
  const jwt = getJwt()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${jwt}`,
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${path} -> ${res.status}: ${body}`)
  }
  return res.json()
}
