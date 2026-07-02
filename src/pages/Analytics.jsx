import { useMemo, useState } from 'react'
import IncomeExpenseBar from '../components/charts/IncomeExpenseBar.jsx'
import CategoryDonut from '../components/charts/CategoryDonut.jsx'
import { categoryColor } from '../lib/categories.js'
import { formatEUR } from '../lib/normalize.js'
import { monthlyByCategory, personSummary, monthlyByAccount } from '../lib/recurring.js'

export default function Analytics({ data, overrides }) {
  const [includeSavings, setIncludeSavings] = useState(false)

  const catTotals = useMemo(
    () => monthlyByCategory(data, overrides, { excludeSavings: !includeSavings }),
    [data, overrides, includeSavings],
  )
  const donut = useMemo(() => {
    const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map((e) => e[0]),
      values: entries.map((e) => Number(e[1].toFixed(2))),
      colors: entries.map((e) => categoryColor(e[0])),
    }
  }, [catTotals])

  const persons = useMemo(() => personSummary(data), [data])
  const personBars = {
    labels: persons.map((p) => p.person),
    income: persons.map((p) => Number(p.income.toFixed(2))),
    expenses: persons.map((p) => Number((p.costs + p.savings).toFixed(2))),
  }

  const byAccount = useMemo(
    () => monthlyByAccount(data).filter((a) => a.total > 0).sort((a, b) => b.total - a.total),
    [data],
  )
  const maxAcc = Math.max(1, ...byAccount.map((a) => a.total))
  const hasSavings = byAccount.some((a) => a.savings > 0)

  return (
    <div>
      <div className="page-header">
        <h1>Analyse</h1>
        <p>Monatliche Kosten nach Kategorie, je Person und je Konto (aus den wiederkehrenden Posten).</p>
      </div>

      <div className="grid charts-2">
        <div className="card">
          <div className="editor-head">
            <h2 style={{ margin: 0 }}>
              Kosten nach Kategorie <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(pro Monat)</span>
            </h2>
            <label className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={includeSavings} onChange={(e) => setIncludeSavings(e.target.checked)} />
              Sparen einbeziehen
            </label>
          </div>
          <CategoryDonut labels={donut.labels} values={donut.values} colors={donut.colors} />
        </div>
        <div className="card">
          <h2>Einkommen vs. Ausgaben je Person</h2>
          <IncomeExpenseBar labels={personBars.labels} income={personBars.income} expenses={personBars.expenses} />
        </div>
      </div>

      <div className="card mt">
        <h2>Kosten je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(pro Monat, inkl. Sparen)</span></h2>
        <div className="hbars">
          {byAccount.map(({ account, fixed, subscription, savings, total }) => (
            <div className="hbar-row" key={account.id}>
              <div className="hbar-label">{account.name}</div>
              <div className="hbar-track">
                <div className="hbar-fill fix" style={{ width: `${(fixed / maxAcc) * 100}%` }} title={`Fixkosten ${formatEUR(fixed)}`} />
                <div className="hbar-fill sub" style={{ width: `${(subscription / maxAcc) * 100}%` }} title={`Abos ${formatEUR(subscription)}`} />
                <div className="hbar-fill sav" style={{ width: `${(savings / maxAcc) * 100}%` }} title={`Sparen ${formatEUR(savings)}`} />
              </div>
              <div className="hbar-value num">{formatEUR(total)}</div>
            </div>
          ))}
          {byAccount.length === 0 && <p className="muted">Noch keine Kosten erfasst.</p>}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          <span className="legend-dot fix" /> Fixkosten &nbsp; <span className="legend-dot sub" /> Abos
          {hasSavings && <>&nbsp; <span className="legend-dot sav" /> Sparen</>}
        </p>
      </div>
    </div>
  )
}
