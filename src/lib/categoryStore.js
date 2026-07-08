// =============================================================================
//  categoryStore.js — benutzerdefinierte Kategorien (hinzufügen/bearbeiten)
// =============================================================================
//  Ergänzt die vordefinierten Kategorien (categories.js) um eigene, serverseitig
//  (Postgres, pro Gruppe) gespeicherte Kategorien sowie Label-/Farb-Änderungen
//  an beliebigen Kategorien. IDs vordefinierter Kategorien bleiben stabil
//  (KEYWORD_RULES/SAVINGS_CATEGORY referenzieren sie) — editierbar sind nur
//  Label und Farbe.
//
//  hydrateCategories() wird einmal beim App-Start mit den vom Server geladenen
//  Zeilen aufgerufen, bevor irgendeine Komponente rendert (siehe App.jsx) —
//  alle Getter unten lesen danach synchron aus dem In-Memory-Zustand. Jede
//  Mutation aktualisiert diesen Zustand sofort und speichert im Hintergrund
//  auf dem Server.
// =============================================================================

import { CATEGORIES as DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from './categories.js'
import { saveCategories } from './storage.js'

let custom = [] // [{id, label, color}]
let overrides = {} // { [id]: {label?, color?} }

export function hydrateCategories(rows = []) {
  custom = rows.filter((r) => r.isCustom).map(({ id, label, color }) => ({ id, label, color }))
  overrides = Object.fromEntries(
    rows.filter((r) => !r.isCustom).map((r) => [r.id, { ...(r.label != null && { label: r.label }), ...(r.color != null && { color: r.color }) }]),
  )
}

function toRows() {
  const customRows = custom.map((c) => ({ ...c, isCustom: true }))
  const overrideRows = Object.entries(overrides).map(([id, patch]) => ({ id, isCustom: false, ...patch }))
  return [...customRows, ...overrideRows]
}

function persist() {
  saveCategories(toRows()).catch((e) => console.error('Kategorien konnten nicht gespeichert werden', e))
}

function getCustom() {
  return custom
}
function getOverrides() {
  return overrides
}

// Alle Kategorien (vordefiniert + eigene), mit Label-/Farb-Änderungen angewandt.
export function getCategories() {
  const ov = getOverrides()
  return [...DEFAULT_CATEGORIES, ...getCustom()].map((c) => ({ ...c, ...(ov[c.id] || {}) }))
}

export function isCustomCategory(id) {
  return getCustom().some((c) => c.id === id)
}

export function categoryColor(id) {
  const c = getCategories().find((x) => x.id === id)
  return c ? c.color : '#64748b'
}

export function categoryLabel(id) {
  const c = getCategories().find((x) => x.id === id)
  return c ? c.label : id || FALLBACK_CATEGORY
}

let idc = 0
export function addCategory(label, color) {
  const id = `cat_${Date.now()}${idc++}`
  custom.push({ id, label: (label || '').trim() || 'Neue Kategorie', color: color || '#64748b' })
  persist()
  return id
}

// Label/Farbe ändern — funktioniert für vordefinierte UND eigene Kategorien.
export function updateCategory(id, patch) {
  const inCustom = custom.find((c) => c.id === id)
  if (inCustom) Object.assign(inCustom, patch)
  else overrides[id] = { ...overrides[id], ...patch }
  persist()
}

// Nur eigene Kategorien können vollständig entfernt werden (Standard-Kategorien
// bleiben erhalten, da Schlüsselwort-Regeln und die Sparen-Erkennung sie referenzieren).
export function removeCategory(id) {
  if (!isCustomCategory(id)) return false
  custom = custom.filter((c) => c.id !== id)
  delete overrides[id]
  persist()
  return true
}
