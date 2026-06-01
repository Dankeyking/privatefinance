import { useMemo, useState } from 'react'
import IncomeExpenseBar from '../components/charts/IncomeExpenseBar.jsx'
import CategoryDonut from '../components/charts/CategoryDonut.jsx'
import BalanceLine from '../components/charts/BalanceLine.jsx'
import { categoryColor } from '../lib/categories.js'
import { formatEUR, formatDate } from '../lib/normalize.js'
import {
  last6MonthBuckets,
  expensesByCategory,
  effectiveCategoryOf,
  forecastBalances,
} from '../lib/selectors.js'

export default function Analytics({ data, overrides, allocations = {} }) {
  const { transactions } = data
  const [drill, setDrill] = useState(null)

  const bars = useMemo(() => last6MonthBuckets(transactions), [transactions])

  const catTotals = useMemo(
    () => expensesByCategory(transactions, overrides, null, allocations),
    [transactions, overrides, allocations],
  )
  const donut = useMemo(() => {
    const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map((e) => e[0]),
      values: entries.map((e) => e[1]),
      colors: entries.map((e) => categoryColor(e[0])),
    }
  }, [catTotals])

  const line = useMemo(() => forecastBalances(data, 3), [data])

  const drillTx = useMemo(() => {
    if (!drill) return []
    return transactions
      .filter((t) => !t.internal && t.amount < 0 && effectiveCategoryOf(t, overrides) === drill)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [drill, transactions, overrides])

  return (
    <div>
      <div className="page-header">
        <h1>Analyse</h1>
        <p>Einnahmen/Ausgaben, Kategorien und Saldoverlauf der letzten 6 Monate.</p>
      </div>

      <div className="grid charts-2">
        <div className="card">
          <h2>Einnahmen vs. Ausgaben</h2>
          <IncomeExpenseBar labels={bars.labels} income={bars.income} expenses={bars.expenses} />
        </div>
        <div className="card">
          <h2>Ausgaben nach Kategorie <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(Segment anklicken)</span></h2>
          <CategoryDonut labels={donut.labels} values={donut.values} colors={donut.colors} onSelect={setDrill} />
        </div>
      </div>

      <div className="card mt">
        <h2>Saldoverlauf je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(gestrichelt = Prognose, 3 Monate)</span></h2>
        <BalanceLine labels={line.labels} series={line.series} splitIndex={line.splitIndex} />
      </div>

      {drill && (
        <div className="card drilldown">
          <button className="btn close" onClick={() => setDrill(null)}>✕ schließen</button>
          <h2>
            <span className="dot" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: categoryColor(drill), marginRight: 8 }} />
            Transaktionen: {drill} <span className="muted" style={{ fontWeight: 400 }}>({formatEUR(catTotals[drill] || 0)})</span>
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Datum</th><th>Empfänger</th><th>Beschreibung</th><th className="num">Betrag</th></tr>
              </thead>
              <tbody>
                {drillTx.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.recipient}</td>
                    <td className="muted">{t.description}</td>
                    <td className="num amount neg">{formatEUR(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
