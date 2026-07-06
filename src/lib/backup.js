// =============================================================================
//  backup.js — Vollständige Datensicherung (eigene Daten) als JSON exportieren/importieren
// =============================================================================
//  Sichert die serverseitig gespeicherten Daten (Konten/Einnahmen/Fixkosten/
//  Umbuchungen + Kategorie-Overrides), damit sie auf einem anderen System oder
//  nach einem Reset wiederhergestellt werden können.
// =============================================================================

import { restoreBackup as restoreBackupOnServer } from './storage.js'

const BACKUP_TYPE = 'privatefinance-backup'
const BACKUP_VERSION = 1

export function buildBackup(manual, categoryOverrides) {
  return {
    app: 'PrivateFinance',
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    manual: manual || {},
    categoryOverrides: categoryOverrides || {},
  }
}

export function downloadBackup(manual, categoryOverrides) {
  const payload = buildBackup(manual, categoryOverrides)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `privatefinance-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return payload
}

// Prüft und parst eine Backup-Datei; wirft bei ungültigem Format (Aufrufer zeigt Fehler an).
export function parseBackup(text) {
  const json = JSON.parse(text)
  if (!json || json.type !== BACKUP_TYPE || typeof json.manual !== 'object') {
    throw new Error('Keine gültige PrivateFinance-Datensicherung.')
  }
  return json
}

// Spielt eine geparste Backup-Datei serverseitig ein.
export function restoreBackup(json) {
  return restoreBackupOnServer(json)
}
