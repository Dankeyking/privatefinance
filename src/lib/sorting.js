// =============================================================================
//  sorting.js — generische Spalten-Sortierung für Tabellen/Karten
// =============================================================================

// Sortiert eine Kopie von `rows`. `getValue(row, key)` liefert den Vergleichswert
// (Default: row[key]). Zahlen numerisch, alles andere alphabetisch (de-Locale).
export function sortRows(rows, key, dir = 'asc', getValue) {
  if (!key) return rows
  const factor = dir === 'desc' ? -1 : 1
  const value = (row) => (getValue ? getValue(row, key) : row[key])
  return [...rows].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * factor
    }
    return String(va ?? '').localeCompare(String(vb ?? ''), 'de', { sensitivity: 'base', numeric: true }) * factor
  })
}

// Nächste Sortierrichtung beim Klick auf eine Spalte: gleiche Spalte -> umdrehen,
// neue Spalte -> Default-Richtung (Zahlen zuerst absteigend, Text aufsteigend).
export function nextSortState(current, key, numeric) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: numeric ? 'desc' : 'asc' }
}
