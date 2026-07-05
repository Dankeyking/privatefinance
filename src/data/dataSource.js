// =============================================================================
//  dataSource.js — Basisdaten für die App
// =============================================================================
//  Rein manuelles Tool: die Basis sind immer die Demo-Daten (mockData). Die
//  eigenen Eingaben aus „Meine Daten" (localStorage) werden in App.jsx via
//  mergeData darübergelegt. Keine Bankanbindung mehr.
// =============================================================================

import { mockData } from './mockData.js'

export async function loadData() {
  return { data: mockData, source: 'mock' }
}
