import { useMemo, useState } from 'react'
import InlineAmount from '../components/InlineAmount.jsx'
import { formatEUR } from '../lib/normalize.js'
import { accountColor } from '../lib/accountColors.js'
import { monthlyByAccount, monthlyInflowByAccount } from '../lib/recurring.js'
import { sortRows, nextSortState } from '../lib/sorting.js'

// Prognose: in wie vielen Monaten ist das Sparziel erreicht (bei aktuellem Zufluss)?
function goalEta(balance, goal, inflow) {
  const remaining = goal - (balance || 0)
  if (remaining <= 0 || inflow <= 0) return null
  const months = Math.ceil(remaining / inflow)
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return { months, label: d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) }
}

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
  const inflowById = useMemo(() => monthlyInflowByAccount(data), [data])

  // „Gesamtvermögen" war die bloße Summe aller Salden: fremdes Geld
  // eingerechnet, Schulden ignoriert. Beides wird hier benannt.
  const gross = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const debtTotal = (data.debts || []).reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0)
  const net = gross - debtTotal
  // Wem gehört was: Privatkonten zählen auf ihren Inhaber, gemeinsame Konten
  // auf „Gemeinsam". Ein gemeinsames Konto auf zwei Köpfe aufzuteilen wäre
  // geraten – wir wissen nicht, wem welcher Euro darauf gehört.
  const byOwner = useMemo(() => {
    const map = {}
    accounts.forEach((a) => {
      const key = a.type === 'joint' ? 'Gemeinsam' : (a.owner || a.name || 'Ohne Inhaber')
      map[key] = (map[key] || 0) + (a.balance || 0)
    })
    return Object.entries(map).sort((x, y) => y[1] - x[1])
  }, [accounts])
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

      <div className="bento">
        <section className="bento-hero" aria-label="Vermögen abzüglich Schulden">
          <div className="bento-hero-label">Vermögen minus Schulden</div>
          <div className={`bento-hero-value ${net >= 0 ? '' : 'neg'}`}>{formatEUR(net)}</div>
          <p className="bento-hero-sub">
            {formatEUR(gross)} auf {accounts.length} Konten
            {debtTotal > 0 && <> abzüglich {formatEUR(debtTotal)} Restschulden</>}. Die Salden
            trägst du selbst nach – sie stimmen nur so gut wie der letzte Abgleich.
          </p>
          <div className="bento-hero-split">
            {byOwner.map(([owner, sum]) => (
              <div className="bento-person" key={owner}>
                <span className="bento-person-name">{owner}</span>
                <span className="bento-person-value">{formatEUR(sum)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="bento-tile">
          <div className="bento-label">Monatslast gesamt</div>
          <div className="bento-value">{formatEUR(monthlyLoad)}</div>
          <div className="bento-hint">was monatlich auf alle Konten soll</div>
        </div>

        <div className="bento-tile">
          <div className="bento-label">Restschulden</div>
          <div className="bento-value">{formatEUR(debtTotal)}</div>
          <div className="bento-hint">{(data.debts || []).length} Eintrag{(data.debts || []).length === 1 ? '' : 'e'}</div>
        </div>

        {withGoal.length > 0 && (
          <div className="bento-tile">
            <div className="bento-label">Sparziele erreicht</div>
            <div className="bento-value">{formatEUR(goalSaved)}</div>
            <div className="bento-bar">
              <span style={{ width: `${goalTotal > 0 ? Math.min(100, (goalSaved / goalTotal) * 100) : 0}%`, background: 'var(--pos)' }} />
            </div>
            <div className="bento-hint">von {formatEUR(goalTotal)}</div>
          </div>
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
          const eta = goal > 0 && !reached ? goalEta(a.balance, goal, inflowById[a.id] || 0) : null
          const underfunded = a.load > 0 && (a.balance || 0) < a.load
          return (
            <div className="card acct" key={a.id} style={{ '--acct-color': accountColor(a, accounts) }}>
              <div className="acct-type">{a.type === 'joint' ? 'Gemeinsam' : `Privat · ${a.owner || ''}`}</div>
              <div className="acct-name">{a.name}</div>
              <InlineAmount
                className={`acct-balance ${(a.balance || 0) < 0 ? 'neg' : ''}`}
                value={a.balance}
                onChange={(v) => update(a.id, { balance: v })}
              />
              {(a.balance || 0) < 0 && (
                <div className="cover-hint warn">⚠ Konto im Minus</div>
              )}
              {a.load > 0 && (
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Monatslast {formatEUR(a.load)}
                </div>
              )}
              {underfunded && (
                <div className="cover-hint warn">
                  ⚠ Deckung {Math.round(((a.balance || 0) / a.load) * 100)} % – es fehlen{' '}
                  {formatEUR(a.load - (a.balance || 0))} für einen Monat
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
                    {eta && (
                      <div className="goal-sub muted">
                        bei {formatEUR(inflowById[a.id] || 0)}/Monat erreicht in ≈ {eta.months} Mon. ({eta.label})
                      </div>
                    )}
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
