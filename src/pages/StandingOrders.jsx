import { useMemo, useState } from 'react'
import CostsTable from '../components/CostsTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import { SAVINGS_CATEGORY } from '../lib/categories.js'
import { toMonthly, formatEUR } from '../lib/normalize.js'
import { isOrderActive } from '../lib/selectors.js'
import { orderToForm, formToOrder, parseAmountDE } from '../lib/orderForm.js'
import { personsFromAccounts } from '../lib/recurring.js'
import { orderMatches, isEmptyFilter, normalizeFilter } from '../lib/viewFilter.js'

// Sparen = Kategorie „Sparen" (unabhängig von Fixkosten/Abo).
const isSav = (o) => o.category === SAVINGS_CATEGORY

// Der Filter kommt aus App.jsx und ist derselbe wie auf Übersicht, Schulden
// und Analyse; diese Seite hatte vorher eine zweite, eigene Filterlogik.
export default function StandingOrders({
  data, overrides, onSaveOrders, filter, onFilterChange, onNavigate,
}) {
  const persons = useMemo(() => personsFromAccounts(data.accounts), [data.accounts])
  const [orders, setOrders] = useState(() => (data.standingOrders || []).map(orderToForm))

  const handleChange = (next) => {
    setOrders(next)
    onSaveOrders?.(next.map((o) => formToOrder(o, persons)))
  }

  // Die Tabelle arbeitet mit der Formularform der Posten; orderMatches nimmt
  // beide Formen (siehe splitOf in viewFilter.js).
  const predicate = (o) => orderMatches(o, filter, overrides)

  // Live-Aufschlüsselung (aus dem Entwurf, damit sie sofort mitzieht).
  // Beendete Posten (Enddatum überschritten) zählen nicht mehr mit.
  const sums = useMemo(() => {
    const acc = { fixed: 0, sub: 0, savings: 0, count: orders.length }
    orders.filter((o) => isOrderActive(o)).forEach((o) => {
      const m = toMonthly(parseAmountDE(o.amount), o.rhythm)
      if (isSav(o)) acc.savings += m
      else if (o.kind === 'subscription') acc.sub += m
      else acc.fixed += m
    })
    return acc
  }, [orders])

  const visibleCount = orders.filter(predicate).length
  const filtered = !isEmptyFilter(filter)
  // Die Art „Schulden" gibt es in der Leiste, weil sie auch für die Schulden
  // gilt. Hier leert sie die Tabelle — dann lieber sagen, wohin man muss.
  const debtOnly = normalizeFilter(filter).kind === 'debt'

  return (
    <div>
      <div className="page-header">
        <h1>Kosten &amp; Abos</h1>
        <p>
          Fixkosten, Abos und Sparen <strong>anlegen, bearbeiten und aufteilen</strong>. Änderungen
          werden automatisch gespeichert und fließen sofort in alle
          Auswertungen ein.
        </p>
      </div>

      <div className="card">
        <div className="editor-head" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0 }}>Alle Posten</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {sums.count} Posten · Fixkosten {formatEUR(sums.fixed)} · Abos {formatEUR(sums.sub)} · Sparen {formatEUR(sums.savings)}
              {filtered && ` · ${visibleCount} sichtbar`}
            </span>
          </div>
        </div>

        <FilterBar data={data} value={filter} onChange={onFilterChange} />

        {debtOnly ? (
          <p className="muted" style={{ padding: '18px 0' }}>
            Die Art „Schulden" ist ausgewählt – Kredite und Schulden stehen auf
            ihrer eigenen Seite.{' '}
            <button className="link-btn" onClick={() => onNavigate?.('debts')}>
              Zu den Schulden
            </button>
          </p>
        ) : (
          <CostsTable
            accounts={data.accounts}
            persons={persons}
            orders={orders}
            onChange={handleChange}
            filter={predicate}
          />
        )}
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          Tipp: <strong>Auf eine Zelle klicken</strong>, um sie zu bearbeiten. Alles mit der
          <strong> Kategorie „Sparen"</strong> zählt als Rücklage (nicht als Kosten) und erscheint
          in der Sparen-Auswertung.
        </p>
      </div>
    </div>
  )
}
