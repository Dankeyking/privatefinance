// =============================================================================
//  layout.js — Reihenfolge von Dashboard-Karten (Drag & Drop), pro Seite
// =============================================================================
//  Die Reihenfolge lag früher im localStorage und damit pro Browser: was am
//  Rechner sortiert wurde, erreichte das Handy nie. Jetzt liegt sie in der
//  Datenbank, pro Benutzer (siehe Preference-Modell in prisma/schema.prisma).
//  Der Aufrufer gibt die gespeicherten Einstellungen und eine Speicherfunktion
//  herein — dieses Modul kennt die API nicht.
// =============================================================================

import { useState } from 'react'

const PREFIX = 'layout:'

// Gespeicherte Reihenfolge mit der aktuellen Liste versöhnen: unbekannte IDs
// fliegen raus, neu dazugekommene Abschnitte hängen hinten an. Ohne das würde
// ein Abschnitt, der später auftaucht (die Schulden, sobald eine eingetragen
// ist), in einer gespeicherten Reihenfolge einfach fehlen.
function reconcile(saved, defaultOrder) {
  if (!Array.isArray(saved)) return defaultOrder
  const known = new Set(defaultOrder)
  const kept = saved.filter((id) => known.has(id))
  const missing = defaultOrder.filter((id) => !kept.includes(id))
  return [...kept, ...missing]
}

// Hook: liefert die aktuelle Kartenreihenfolge + Drag-Handler + Reset.
//   pageKey      eindeutiger Schlüssel je Seite ('overview', 'analytics')
//   defaultOrder Ausgangsreihenfolge, gleichzeitig die Liste der gültigen IDs
//   prefs        { [key]: value } aus der DB
//   onSave       (key, value) => void
export function useDragOrder(pageKey, defaultOrder, prefs = {}, onSave) {
  const storeKey = PREFIX + pageKey
  const [custom, setCustom] = useState(null)
  const [dragId, setDragId] = useState(null)

  // Die gespeicherte Reihenfolge kommt asynchron herein. Solange niemand in
  // dieser Sitzung gezogen hat, zählt sie; danach der lokale Zustand.
  const order = reconcile(custom ?? prefs[storeKey], defaultOrder)

  const api = {
    dragId,
    start: (id) => setDragId(id),
    drop: (overId) => {
      if (!dragId || dragId === overId) return
      const from = order.indexOf(dragId)
      const to = order.indexOf(overId)
      if (from === -1 || to === -1) return
      const next = [...order]
      next.splice(from, 1)
      next.splice(to, 0, dragId)
      setCustom(next)
      onSave?.(storeKey, next)
    },
    end: () => setDragId(null),
  }

  const isCustom = order.join('|') !== defaultOrder.join('|')
  const reset = () => {
    setCustom(defaultOrder)
    onSave?.(storeKey, defaultOrder)
  }

  return { order, api, reset, isCustom }
}
