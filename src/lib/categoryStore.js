// =============================================================================
//  categoryStore.js — benutzerdefinierte Kategorien (hinzufügen/bearbeiten)
// =============================================================================
//  Ergänzt die vordefinierten Kategorien (categories.js) um eigene, im Browser
//  gespeicherte Kategorien sowie Label-/Farb-Änderungen an beliebigen Kategorien.
//  IDs vordefinierter Kategorien bleiben stabil (KEYWORD_RULES/SAVINGS_CATEGORY
//  referenzieren sie) — editierbar sind nur Label und Farbe.
// =============================================================================

import { CATEGORIES as DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from './categories.js'

const CUSTOM_KEY = 'pf_categories_custom'
const OVERRIDES_KEY = 'pf_categories_overrides'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* localStorage nicht verfügbar – still ignorieren */
  }
}

function getCustom() {
  return readJSON(CUSTOM_KEY, [])
}
function getOverrides() {
  return readJSON(OVERRIDES_KEY, {})
}

// Alle Kategorien (vordefiniert + eigene), mit Label-/Farb-Änderungen angewandt.
export function getCategories() {
  const overrides = getOverrides()
  return [...DEFAULT_CATEGORIES, ...getCustom()].map((c) => ({ ...c, ...(overrides[c.id] || {}) }))
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
  const custom = getCustom()
  custom.push({ id, label: (label || '').trim() || 'Neue Kategorie', color: color || '#64748b' })
  writeJSON(CUSTOM_KEY, custom)
  return id
}

// Label/Farbe ändern — funktioniert für vordefinierte UND eigene Kategorien.
export function updateCategory(id, patch) {
  const overrides = getOverrides()
  overrides[id] = { ...overrides[id], ...patch }
  writeJSON(OVERRIDES_KEY, overrides)
}

// Nur eigene Kategorien können vollständig entfernt werden (Standard-Kategorien
// bleiben erhalten, da Schlüsselwort-Regeln und die Sparen-Erkennung sie referenzieren).
export function removeCategory(id) {
  if (!isCustomCategory(id)) return false
  writeJSON(CUSTOM_KEY, getCustom().filter((c) => c.id !== id))
  const overrides = getOverrides()
  delete overrides[id]
  writeJSON(OVERRIDES_KEY, overrides)
  return true
}
