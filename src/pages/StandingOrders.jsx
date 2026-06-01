import { useMemo, useState } from 'react'
import CategoryTag from '../components/CategoryTag.jsx'
import { toMonthly, formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import { CATEGORIES } from '../lib/categories.js'
import { effectiveCategoryOf } from '../lib/selectors.js'

export default function StandingOrders({ data, overrides, onSetCategory }) {
  const { accounts, standingOrders } = data
  const accMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])

  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const rows = useMemo(
    () =>
      standingOrders
        .map((so) => {
          const acc = accMap[so.accountId]
          return {
            ...so,
            account: acc,
            monthly: toMonthly(so.amount, so.rhythm),
            category: effectiveCategoryOf(so, overrides),
            isOverride: Boolean(overrides[so.id]),
            runsOnJoint: acc?.type === 'joint',
          }
        })
        .filter((r) => accountFilter === 'all' || r.accountId === accountFilter)
        .filter((r) => categoryFilter === 'all' || r.category === categoryFilter)
        .sort((a, b) => b.monthly - a.monthly),
    [standingOrders, accMap, overrides, accountFilter, categoryFilter],
  )

  const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0)
  const notJointCount = rows.filter((r) => !r.runsOnJoint).length

  return (
    <div>
      <div className="page-header">
        <h1>Daueraufträge</h1>
        <p>
          {rows.length} Aufträge · {formatEUR(totalMonthly)}/Monat normalisiert
          {notJointCount > 0 && ` · ${notJointCount} laufen noch übers Privatkonto`}
        </p>
      </div>

      <div className="card">
        <div className="filters">
          <label>
            Konto
            <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="all">Alle Konten</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label>
            Kategorie
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Alle Kategorien</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empfänger</th>
                <th className="num">Betrag</th>
                <th>Rhythmus</th>
                <th className="num">pro Monat</th>
                <th>Nächste Ausführung</th>
                <th>Konto</th>
                <th>Kategorie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.runsOnJoint ? '' : 'not-joint'}>
                  <td>
                    {r.recipient}
                    {!r.runsOnJoint && <span className="flag">⚠ Privatkonto</span>}
                  </td>
                  <td className="num">{formatEUR(r.amount)}</td>
                  <td>{RHYTHM_LABELS[r.rhythm] || r.rhythm}</td>
                  <td className="num">{formatEUR(r.monthly)}</td>
                  <td>{formatDate(r.nextExecution)}</td>
                  <td>{r.account?.name || r.accountId}</td>
                  <td>
                    <CategoryTag
                      value={r.category}
                      isOverride={r.isOverride}
                      onChange={(cat) => onSetCategory(r.id, cat)}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                    Keine Daueraufträge für diese Filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
