import { useMemo, useState } from 'react'
import CategoryTag from '../components/CategoryTag.jsx'
import { toMonthly, formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import { CATEGORIES } from '../lib/categories.js'
import { effectiveCategoryOf } from '../lib/selectors.js'

const KIND_LABEL = { fixed: 'Fixkosten', subscription: 'Abo' }

export default function StandingOrders({ data, overrides, onSetCategory }) {
  const { accounts, standingOrders } = data
  const accMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])

  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')

  const rows = useMemo(
    () =>
      standingOrders
        .map((so) => {
          const acc = accMap[so.accountId]
          return {
            ...so,
            kind: so.kind || 'fixed',
            account: acc,
            monthly: toMonthly(so.amount, so.rhythm),
            category: effectiveCategoryOf(so, overrides),
            isOverride: Boolean(overrides[so.id]),
          }
        })
        .filter((r) => accountFilter === 'all' || r.accountId === accountFilter)
        .filter((r) => categoryFilter === 'all' || r.category === categoryFilter)
        .filter((r) => kindFilter === 'all' || r.kind === kindFilter)
        .sort((a, b) => b.monthly - a.monthly),
    [standingOrders, accMap, overrides, accountFilter, categoryFilter, kindFilter],
  )

  const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0)
  const aboCount = rows.filter((r) => r.kind === 'subscription').length

  return (
    <div>
      <div className="page-header">
        <h1>Kosten &amp; Abos</h1>
        <p>
          {rows.length} Posten · {formatEUR(totalMonthly)}/Monat normalisiert
          {aboCount > 0 && ` · davon ${aboCount} Abos`}
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
          <label>
            Art
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
              <option value="all">Alle</option>
              <option value="fixed">Fixkosten</option>
              <option value="subscription">Abos</option>
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
                <th>Art</th>
                <th>Nächste Ausführung</th>
                <th>Konto</th>
                <th>Kategorie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.recipient}</td>
                  <td className="num">{formatEUR(r.amount)}</td>
                  <td>{RHYTHM_LABELS[r.rhythm] || r.rhythm}</td>
                  <td className="num">{formatEUR(r.monthly)}</td>
                  <td><span className={`pill ${r.kind === 'subscription' ? 'sub' : 'fix'}`}>{KIND_LABEL[r.kind]}</span></td>
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
                  <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                    Keine Posten für diese Filter.
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
