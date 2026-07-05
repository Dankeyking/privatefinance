import { useState } from 'react'

// Wrapper, der einen Dashboard-Abschnitt per Griff verschiebbar macht. `draggable`
// wird nur während des Ziehens am Griff aktiviert, damit Klicks/Eingaben im
// Inhalt (Checkboxen, editierbare Zellen …) unberührt bleiben.
export default function DragCard({ id, api, className = '', full, children }) {
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState(false)

  return (
    <div
      className={`drag-card ${full ? 'full' : ''} ${className} ${dragging ? 'dragging' : ''} ${over ? 'drag-over' : ''}`}
      draggable={dragging}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; api.start(id) }}
      onDragOver={(e) => { e.preventDefault(); if (api.dragId && api.dragId !== id) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); api.drop(id) }}
      onDragEnd={() => { setDragging(false); api.end() }}
    >
      <span
        className="drag-handle"
        title="Ziehen zum Verschieben"
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
      >
        ⠿
      </span>
      {children}
    </div>
  )
}
