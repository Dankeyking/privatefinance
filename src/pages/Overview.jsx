import { useMemo } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import AccountCard from '../components/AccountCard.jsx'
import SankeyFlow from '../components/charts/SankeyFlow.jsx'
import { formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import {
  totalBalance,
  sortedMonths,
  incomeExpenseForMonth,
  upcomingPayments,
} from '../lib/selectors.js'
import { buildSankeyData } from '../lib/flows.js'

export default function Overview({ data, overrides }) {
  const { accounts, transactions } = data
  const months = sortedMonths(transactions)
  const latest = months[months.length - 1]
  const { income, expenses, surplus } = incomeExpenseForMonth(transactions, latest || '')

  const sankey = useMemo(() => buildSankeyData(data, overrides), [data, overrides])
  const upcoming = useMemo(() => upcomingPayments(data, 30), [data])

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

      <div className="grid flow-row mt">
        <div className="card">
          <h2>Geldfluss – Einkommen → Privatkonten → Gemeinschaftskonto → Fixkosten</h2>
          <SankeyFlow
            flows={sankey.flows}
            nodeColors={sankey.nodeColors}
            columns={sankey.columns}
            labels={sankey.labels}
          />
        </div>

        <div className="card">
          <h2>Anstehende Zahlungen <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(30 Tage)</span></h2>
          {upcoming.length === 0 ? (
            <p className="muted">Keine Daueraufträge in den nächsten 30 Tagen.</p>
          ) : (
            <ul className="upcoming">
              {upcoming.map((u) => (
                <li key={u.id} className={u.runsOnJoint ? '' : 'not-joint'}>
                  <div className="up-main">
                    <span className="up-recipient">{u.recipient}</span>
                    <span className="up-amount">{formatEUR(u.amount)}</span>
                  </div>
                  <div className="up-sub muted">
                    {u.daysUntil === 0 ? 'heute' : u.daysUntil === 1 ? 'morgen' : `in ${u.daysUntil} Tagen`}
                    {' · '}{formatDate(u.nextExecution)}
                    {' · '}{RHYTHM_LABELS[u.rhythm] || u.rhythm}
                    {!u.runsOnJoint && <span className="flag">⚠ Privatkonto</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
