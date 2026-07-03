import { useMemo, useState } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import InlineAmount from '../components/InlineAmount.jsx'
import { formatEUR } from '../lib/normalize.js'
import { accountColor } from '../lib/accountColors.js'
import { monthlyByAccount } from '../lib/recurring.js'
import { sortRows, nextSortState } from '../lib/sorting.js'

const SORT_OPTS = [
  { key: 'name', label: 'Name' },
  { key: 'balance', label: 'Saldo' },
  { key: 'load', label: 'Monatslast' },
]

export default function Accounts({ data, onSaveAccounts }) {
  const [accounts, setAccounts] = useState(() => (data.accounts || []).map((a) => ({ ...a })))
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const byAccount = useMemo(() => monthlyByAccount(data), [data])
  const loadById = Object.fromEntries(byAccount.map((a) => [a.account.id, a.total]))

  const netWorth = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const monthlyLoad = byAccount.reduce((s, a) => s + a.total, 0)
  const withGoal = accounts.filter((a) => (a.goal || 0) > 0)
  const goalTotal = withGoal.reduce((s, a) => s + a.goal, 0)
  const goalSaved = withGoal.reduce((s, a) => s + Math.min(a.balance || 0, a.goal), 0)

  function update(id, patch) {
    const next = accounts.map((a) => (a.id === id ? { ...a, ...patch } : a))
    setAccounts(next)
    onSaveAccounts?.(next)
  }

  const sorted = useMemo(() => {
    const withLoad = accounts.map((a) => ({ ...a, load: loadById[a.id] || 0 }))
    if (!sort.key) return withLoad
    return sortRows(withLoad, sort.key, sort.dir, (row, key) =>
      key === 'name' ? row.name || '' : Number(row[key]) || 0,
    )
  }, [accounts, loadById, sort])

  const toggleSort = (key) => setSort((s) => nextSortState(s, key, key !== 'name'))

  return (
    <div>
      <div className="page-header">
        <h1>Konten</h1>
        <p>Aktuelle Kontostände, monatliche Last je Konto und Fortschritt zu deinen Sparzielen. Klicke auf einen Betrag, um ihn zu aktualisieren.</p>
      </div>

      <div className="grid kpis">
        <KpiCard label="Gesamtvermögen" value={netWorth} tone={netWorth >= 0 ? 'pos' : 'neg'} hint={`${accounts.length} Konten`} />
        <KpiCard label="Monatslast gesamt" value={monthlyLoad} tone="neg" />
        {withGoal.length > 0 && (
          <KpiCard
            label="Sparziele erreicht"
            value={goalSaved}
            hint={`von ${formatEUR(goalTotal)} · ${goalTotal > 0 ? Math.round((goalSaved / goalTotal) * 100) : 0} %`}
          />
        )}
      </div>

      <div className="editor-head mt" style={{ alignItems: 'center' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Alle Konten</h2>
        <div className="sort-controls">
          <span className="muted" style={{ fontSize: 12 }}>Sortieren:</span>
          {SORT_OPTS.map((o) => (
            <button
              key={o.key}
              className={`sort-chip ${sort.key === o.key ? 'active' : ''}`}
              onClick={() => toggleSort(o.key)}
            >
              {o.label}{sort.key === o.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="grid accounts mt">
        {sorted.map((a) => {
          const goal = a.goal || 0
          const pct = goal > 0 ? Math.min(100, Math.round(((a.balance || 0) / goal) * 100)) : 0
          const reached = goal > 0 && (a.balance || 0) >= goal
          return (
            <div className="card acct" key={a.id} style={{ '--acct-color': accountColor(a, accounts) }}>
              <div className="acct-type">{a.type === 'joint' ? 'Gemeinsam' : `Privat · ${a.owner || ''}`}</div>
              <div className="acct-name">{a.name}</div>
              <InlineAmount
                className="acct-balance"
                value={a.balance}
                onChange={(v) => update(a.id, { balance: v })}
              />
              {a.load > 0 && (
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Monatslast {formatEUR(a.load)}
                </div>
              )}
              <div className="goal">
                {goal > 0 ? (
                  <>
                    <div className="goal-bar">
                      <div className="goal-fill" style={{ width: `${pct}%`, background: 'var(--acct-color)' }} />
                    </div>
                    <div className="goal-sub muted">
                      {reached ? '🎯 Ziel erreicht' : `${pct} %`} · Ziel{' '}
                      <InlineAmount value={a.goal} onChange={(v) => update(a.id, { goal: v })} className="goal-edit" />
                    </div>
                  </>
                ) : (
                  <button className="goal-add" onClick={() => update(a.id, { goal: 100 })}>+ Sparziel setzen</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
