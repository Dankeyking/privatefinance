import { useMemo, useState } from 'react'
import RecurringEditor from '../components/RecurringEditor.jsx'
import { formatEUR } from '../lib/normalize.js'
import { orderToForm, formToOrder } from '../lib/orderForm.js'
import { personsFromAccounts, householdSummary } from '../lib/recurring.js'

// Editierbare Seite: Fixkosten & Abos anlegen, bearbeiten, löschen (Auto-Speichern).
export default function StandingOrders({ data, onSaveOrders }) {
  const persons = useMemo(() => personsFromAccounts(data.accounts), [data.accounts])
  const [orders, setOrders] = useState(() => (data.standingOrders || []).map(orderToForm))
  const total = useMemo(() => householdSummary(data).totalCosts, [data])

  const handleChange = (next) => {
    setOrders(next)
    onSaveOrders?.(next.map((o) => formToOrder(o, persons)))
  }

  return (
    <div>
      <div className="page-header">
        <h1>Kosten &amp; Abos</h1>
        <p>
          Fixkosten und Abos <strong>anlegen, bearbeiten und aufteilen</strong>. Änderungen werden
          automatisch gespeichert (nur in diesem Browser) und fließen sofort in alle Auswertungen ein.
        </p>
      </div>

      <div className="card">
        <div className="editor-head" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0 }}>Alle Posten</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {orders.length} Posten · {formatEUR(total)}/Monat
            </span>
          </div>
        </div>
        <RecurringEditor
          accounts={data.accounts}
          persons={persons}
          orders={orders}
          onChange={handleChange}
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          Tipp: Mit <strong>+ Fixkosten</strong> / <strong>+ Abo</strong> neue Posten anlegen, mit
          <strong> ✕</strong> löschen. Die <em>Aufteilung</em> legt fest, wer welchen Anteil trägt
          (Gleich / Eine Person / Prozent / Beträge €).
        </p>
      </div>
    </div>
  )
}
