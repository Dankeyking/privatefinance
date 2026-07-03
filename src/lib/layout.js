// =============================================================================
//  layout.js — Reihenfolge von Dashboard-Karten (Drag & Drop), pro Seite gespeichert
// =============================================================================

import { useState } from 'react'

const PREFIX = 'pf_layout_'

function readOrder(pageKey, defaultOrder) {
  try {
    const raw = localStorage.getItem(PREFIX + pageKey)
    if (!raw) return defaultOrder
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return defaultOrder
    const known = new Set(defaultOrder)
    const kept = saved.filter((id) => known.has(id))
    const missing = defaultOrder.filter((id) => !kept.includes(id))
    return [...kept, ...missing]
  } catch {
    return defaultOrder
  }
}
function writeOrder(pageKey, order) {
  try {
    localStorage.setItem(PREFIX + pageKey, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

// Hook: liefert die aktuelle Kartenreihenfolge + Drag-Handler + Reset.
// pageKey = eindeutiger Speicherschlüssel je Seite, defaultOrder = Ausgangsreihenfolge.
export function useDragOrder(pageKey, defaultOrder) {
  const [order, setOrder] = useState(() => readOrder(pageKey, defaultOrder))
  const [dragId, setDragId] = useState(null)

  const api = {
    dragId,
    start: (id) => setDragId(id),
    drop: (overId) => {
      setOrder((prev) => {
        if (!dragId || dragId === overId) return prev
        const next = [...prev]
        const from = next.indexOf(dragId)
        const to = next.indexOf(overId)
        if (from === -1 || to === -1) return prev
        next.splice(from, 1)
        next.splice(to, 0, dragId)
        writeOrder(pageKey, next)
        return next
      })
    },
    end: () => setDragId(null),
  }

  const isCustom = order.join('|') !== defaultOrder.join('|')
  const reset = () => {
    setOrder(defaultOrder)
    writeOrder(pageKey, defaultOrder)
  }

  return { order, api, reset, isCustom }
}
