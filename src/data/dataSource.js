// =============================================================================
//  dataSource.js — lädt echte Daten (public/data.json) oder Mock-Fallback
// =============================================================================
//  Reihenfolge:
//    1. /data.json  (vom Node-Skript scripts/fetch-data.js erzeugt) – echte C24-Daten
//    2. Mock-Daten  (src/data/mockData.js) – immer als Fallback verfügbar
//
//  Setze VITE_MOCK_MODE=true (in .env), um echte Daten zu ignorieren und immer
//  Mock-Daten zu nutzen.
// =============================================================================

import { mockData } from './mockData.js'

const FORCE_MOCK = import.meta.env?.VITE_MOCK_MODE === 'true'

// Lädt die Daten und meldet zurück, woher sie stammen.
export async function loadData() {
  if (FORCE_MOCK) {
    return { data: mockData, source: 'mock', reason: 'VITE_MOCK_MODE=true' }
  }

  try {
    const res = await fetch('/data.json', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      if (json && Array.isArray(json.accounts) && json.accounts.length) {
        return { data: json, source: 'live' }
      }
    }
  } catch {
    /* keine echten Daten -> Fallback */
  }

  return { data: mockData, source: 'mock', reason: 'public/data.json nicht gefunden' }
}
