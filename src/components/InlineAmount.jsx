import { useEffect, useRef, useState } from 'react'
import { formatEUR } from '../lib/normalize.js'
import { parseAmountDE } from '../lib/orderForm.js'

// Klick-zum-Bearbeiten Betrag. Zeigt formatiert an; Klick öffnet ein Textfeld
// (Komma-Eingabe), Enter/Blur/Klick-außerhalb übernimmt, Escape verwirft.
export default function InlineAmount({ value, onChange, className = '', placeholder = '0,00' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!editing) return
    function commit() {
      setEditing(false)
      onChange(parseAmountDE(draft))
    }
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) commit() }
    function onKey(e) {
      if (e.key === 'Enter') commit()
      if (e.key === 'Escape') setEditing(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, draft])

  if (editing) {
    return (
      <span ref={ref} className={`inline-amount-edit ${className}`}>
        <input autoFocus type="text" inputMode="decimal" value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)} />
      </span>
    )
  }
  return (
    <span
      className={`ct-edit ${className}`}
      onClick={() => { setDraft(value || value === 0 ? String(value).replace('.', ',') : ''); setEditing(true) }}
      title="Klicken zum Bearbeiten"
    >
      {formatEUR(Number(value) || 0)}
    </span>
  )
}
