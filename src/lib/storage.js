// =============================================================================
//  storage.js — Persistenz über die Server-API (Postgres statt localStorage)
// =============================================================================

async function getJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

async function putJSON(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

// Liefert { manual: {accounts, incomes, standingOrders, transfers, debts}, categoryOverrides, categories }.
export function loadManualData() {
  return getJSON('/api/data')
}

// Ersetzt Konten/Einnahmen/Fixkosten/Umbuchungen vollständig (wie bisher localStorage setItem).
export function saveManual(manual) {
  return putJSON('/api/manual', manual)
}

// Ersetzt die Kategorie-Overrides vollständig.
export function saveCategoryOverrides(categoryOverrides) {
  return putJSON('/api/category-overrides', categoryOverrides)
}

// Ersetzt eigene Kategorien + Label-/Farb-Overrides vollständig.
export function saveCategories(categories) {
  return putJSON('/api/categories', categories)
}

// Spielt eine Backup-Datei (siehe backup.js) serverseitig ein.
export async function restoreBackup(backupJson) {
  const res = await fetch('/api/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupJson),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Restore fehlgeschlagen (HTTP ${res.status})`)
  }
  return res.json()
}
