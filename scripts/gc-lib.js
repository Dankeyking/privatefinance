// =============================================================================
//  scripts/gc-lib.js — gemeinsame Helfer für die GoCardless-Skripte
// =============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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
export const BASE = env.GOCARDLESS_BASE_URL || 'https://bankaccountdata.gocardless.com/api/v2'

export async function api(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${path} -> ${res.status}: ${body}`)
  }
  return res.json()
}

export async function getToken() {
  const SECRET_ID = env.GOCARDLESS_SECRET_ID
  const SECRET_KEY = env.GOCARDLESS_SECRET_KEY
  if (!SECRET_ID || !SECRET_KEY || SECRET_ID.includes('dein-secret')) {
    console.error('❌ GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY fehlen in .env (siehe .env.example)')
    process.exit(1)
  }
  const data = await api('/token/new/', null, {
    method: 'POST',
    body: JSON.stringify({ secret_id: SECRET_ID, secret_key: SECRET_KEY }),
  })
  return data.access
}
