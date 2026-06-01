import KpiCard from '../components/KpiCard.jsx'
import AccountCard from '../components/AccountCard.jsx'
import FlowDiagram from '../components/FlowDiagram.jsx'
import {
  totalBalance,
  sortedMonths,
  incomeExpenseForMonth,
  effectiveCategoryOf,
} from '../lib/selectors.js'

export default function Overview({ data, overrides }) {
  const { accounts, transactions, standingOrders } = data
  const months = sortedMonths(transactions)
  const latest = months[months.length - 1]
  const { income, expenses, surplus } = incomeExpenseForMonth(transactions, latest || '')

  return (
    <div>
      <div className="page-header">
        <h1>Übersicht</h1>
        <p>Haushalts-Cashflow über alle C24-Konten – aktueller Monat.</p>
      </div>

      <div className="grid kpis">
        <KpiCard label="Gesamtsaldo" value={totalBalance(accounts)} />
        <KpiCard label="Einnahmen (Monat)" value={income} tone="pos" />
        <KpiCard label="Ausgaben (Monat)" value={expenses} tone="neg" />
        <KpiCard label="Überschuss" value={surplus} tone={surplus >= 0 ? 'pos' : 'neg'} />
      </div>

      <div className="grid accounts mt">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
      </div>

      <div className="card mt">
        <h2>Geldfluss – wer zahlt was von welchem Konto</h2>
        <FlowDiagram
          accounts={accounts}
          standingOrders={standingOrders}
          getCategory={(so) => effectiveCategoryOf(so, overrides)}
        />
      </div>
    </div>
  )
}
