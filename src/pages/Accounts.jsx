import { useMemo } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import { formatEUR } from '../lib/normalize.js'
import { accountColor } from '../lib/accountColors.js'
import { monthlyByAccount } from '../lib/recurring.js'

export default function Accounts({ data }) {
  const accounts = data.accounts || []
  const byAccount = useMemo(() => monthlyByAccount(data), [data])
  const loadById = Object.fromEntries(byAccount.map((a) => [a.account.id, a.total]))

  const netWorth = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const monthlyLoad = byAccount.reduce((s, a) => s + a.total, 0)
  const withGoal = accounts.filter((a) => (a.goal || 0) > 0)
  const goalTotal = withGoal.reduce((s, a) => s + a.goal, 0)
  const goalSaved = withGoal.reduce((s, a) => s + Math.min(a.balance || 0, a.goal), 0)

  return (
    <div>
      <div className="page-header">
        <h1>Konten</h1>
        <p>Aktuelle Kontostände, monatliche Last je Konto und Fortschritt zu deinen Sparzielen.</p>
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

      <h2 className="section-title mt">Alle Konten</h2>
      <div className="grid accounts">
        {accounts.map((a) => {
          const load = loadById[a.id] || 0
          const goal = a.goal || 0
          const pct = goal > 0 ? Math.min(100, Math.round(((a.balance || 0) / goal) * 100)) : 0
          const reached = goal > 0 && (a.balance || 0) >= goal
          return (
            <div className="card acct" key={a.id} style={{ '--acct-color': accountColor(a, accounts) }}>
              <div className="acct-type">{a.type === 'joint' ? 'Gemeinsam' : `Privat · ${a.owner || ''}`}</div>
              <div className="acct-name">{a.name}</div>
              <div className={`acct-balance ${(a.balance || 0) < 0 ? 'neg' : ''}`}>{formatEUR(a.balance)}</div>
              {load > 0 && (
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Monatslast {formatEUR(load)}
                </div>
              )}
              {goal > 0 && (
                <div className="goal">
                  <div className="goal-bar">
                    <div className="goal-fill" style={{ width: `${pct}%`, background: 'var(--acct-color)' }} />
                  </div>
                  <div className="goal-sub muted">
                    {reached ? '🎯 Ziel erreicht' : `${pct} %`} · Ziel {formatEUR(goal)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
