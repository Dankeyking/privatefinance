// =============================================================================
//  storage.js — Kategorie-Overrides in localStorage
// =============================================================================
//  Manuelle Kategorie-Zuweisungen überlagern die Auto-Kategorisierung.
//  Schlüssel: Item-ID (Standing-Order-ID oder Transaktions-ID) -> Kategorie-ID.
// =============================================================================

const STORAGE_KEY = 'pf_category_overrides'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* localStorage nicht verfügbar – still ignorieren */
  }
}

// Alle Overrides als { itemId: categoryId } lesen.
export function getOverrides() {
  return readAll()
}

// Einzelnes Override setzen.
export function setOverride(itemId, categoryId) {
  const map = readAll()
  map[itemId] = categoryId
  writeAll(map)
  return map
}

// Einzelnes Override entfernen.
export function clearOverride(itemId) {
  const map = readAll()
  delete map[itemId]
  writeAll(map)
  return map
}

// Alle Overrides zurücksetzen.
export function clearAllOverrides() {
  writeAll({})
  return {}
}

// Alle Overrides in einem Rutsch ersetzen (z. B. beim Backup-Import).
export function setAllOverrides(map) {
  writeAll(map || {})
  return map || {}
}

// Effektive Kategorie: Override > vorhandene Kategorie am Item.
export function effectiveCategory(item, overrides) {
  const ovr = overrides ?? readAll()
  return ovr[item.id] || item.category
}

// --- Manuelle Daten (Konten / Daueraufträge / Beiträge) ----------------------
// Bleiben nur im Browser (localStorage) und werden über die Basis-Daten
// (Enable Banking data.json bzw. Mock) gelegt.
const MANUAL_KEY = 'pf_manual'

export function getManualData() {
  try {
    const raw = localStorage.getItem(MANUAL_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveManualData(obj) {
  try {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(obj))
  } catch {
    /* ignore */
  }
  return obj
}

export function clearManualData() {
  try {
    localStorage.removeItem(MANUAL_KEY)
  } catch {
    /* ignore */
  }
  return {}
}
