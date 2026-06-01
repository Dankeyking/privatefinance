import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, categoryColor } from '../lib/categories.js'

// Inline editierbares Kategorie-Tag. Klick öffnet die Auswahl.
// `isOverride` markiert manuell gesetzte Kategorien.
export default function CategoryTag({ value, isOverride, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <span className="cat-tag" ref={ref}>
      <button
        type="button"
        className="chip"
        style={{ background: categoryColor(value) }}
        onClick={() => setOpen((o) => !o)}
        title="Kategorie ändern"
      >
        {value}
        {isOverride && <span title="manuell gesetzt">✎</span>}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="menu">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id)
                setOpen(false)
              }}
            >
              <span className="dot" style={{ background: c.color }} />
              {c.label}
              {c.id === value && <span className="override-mark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
