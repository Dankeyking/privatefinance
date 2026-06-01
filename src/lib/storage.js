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

// Effektive Kategorie: Override > vorhandene Kategorie am Item.
export function effectiveCategory(item, overrides) {
  const ovr = overrides ?? readAll()
  return ovr[item.id] || item.category
}
