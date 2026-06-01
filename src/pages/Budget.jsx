import { useMemo, useState } from 'react'
import { CATEGORIES, categoryColor } from '../lib/categories.js'
import { formatEUR } from '../lib/normalize.js'
import { getBudgets, setBudget } from '../lib/storage.js'
import { expensesByCategory, sortedMonths } from '../lib/selectors.js'

export default function Budget({ data, overrides, allocations = {} }) {
  const { transactions } = data
  const [budgets, setBudgets] = useState(() => getBudgets())

  const latest = useMemo(() => {
    const m = sortedMonths(transactions)
    return m[m.length - 1]
  }, [transactions])

  const spentByCat = useMemo(
    () => expensesByCategory(transactions, overrides, latest, allocations),
    [transactions, overrides, latest, allocations],
  )

  function handleChange(catId, value) {
    setBudgets({ ...setBudget(catId, value) })
  }

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0)
  const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0)

  return (
    <div>
      <div className="page-header">
        <h1>Budget</h1>
        <p>
          Monatsbudget je Kategorie festlegen – Ist-Ausgaben des aktuellen Monats im Vergleich.
          Werte werden lokal gespeichert.
        </p>
      </div>

      <div className="grid kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card kpi">
          <div className="kpi-label">Budget gesamt</div>
          <div className="kpi-value">{formatEUR(totalBudget)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Ausgegeben (Monat)</div>
          <div className="kpi-value neg">{formatEUR(totalSpent)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Verbleibend</div>
          <div className={`kpi-value ${totalBudget - totalSpent >= 0 ? 'pos' : 'neg'}`}>
            {formatEUR(totalBudget - totalSpent)}
          </div>
        </div>
      </div>

      <div className="card mt">
        <h2>Budgets je Kategorie</h2>
        <div className="budget-list">
          {CATEGORIES.map((c) => {
            const budget = budgets[c.id] || 0
            const spent = spentByCat[c.id] || 0
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
            const over = budget > 0 && spent > budget
            return (
              <div className="budget-row" key={c.id}>
                <div className="budget-head">
                  <span className="budget-cat">
                    <span className="dot" style={{ background: categoryColor(c.id) }} />
                    {c.label}
                  </span>
                  <span className="budget-figures">
                    <span className={over ? 'amount neg' : ''}>{formatEUR(spent)}</span>
                    <span className="muted"> / </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      className="budget-input"
                      value={budget || ''}
                      placeholder="–"
                      onChange={(e) => handleChange(c.id, e.target.value)}
                    />
                    <span className="muted"> €</span>
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className="budget-fill"
                    style={{ width: `${pct}%`, background: over ? 'var(--neg)' : categoryColor(c.id) }}
                  />
                </div>
                {budget > 0 && (
                  <div className="budget-sub muted">
                    {over
                      ? `${formatEUR(spent - budget)} über Budget`
                      : `${formatEUR(budget - spent)} übrig (${Math.round(pct)} %)`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
