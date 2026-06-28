import { useMemo } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import { formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import { upcomingPayments } from '../lib/selectors.js'
import {
  householdSummary,
  monthlyByAccount,
  jointCoverage,
  personSummary,
} from '../lib/recurring.js'

export default function Overview({ data }) {
  const summary = useMemo(() => householdSummary(data), [data])
  const byAccount = useMemo(() => monthlyByAccount(data), [data])
  const coverage = useMemo(() => jointCoverage(data), [data])
  const persons = useMemo(() => personSummary(data), [data])
  const upcoming = useMemo(() => upcomingPayments(data, 30), [data])

  const covById = Object.fromEntries(coverage.map((c) => [c.account.id, c]))

  return (
    <div>
      <div className="page-header">
        <h1>Übersicht</h1>
        <p>Manuelle Haushaltsplanung – Einnahmen, Fixkosten &amp; Abos je Konto und je Person.</p>
      </div>

      <div className="grid kpis">
        <KpiCard label="Einnahmen / Monat" value={summary.totalIncome} tone="pos" />
        <KpiCard label="Fixkosten & Abos / Monat" value={summary.totalCosts} tone="neg" />
        <KpiCard label="Überschuss / Monat" value={summary.surplus} tone={summary.surplus >= 0 ? 'pos' : 'neg'} />
      </div>

      {/* Abschnitt A — Kosten je Konto */}
      <h2 className="section-title mt">Kosten je Konto</h2>
      <div className="grid accounts">
        {byAccount.map(({ account, fixed, subscription, total }) => {
          const cov = covById[account.id]
          return (
            <div className={`card acct ${account.type}`} key={account.id}>
              <div className="acct-type">{account.type === 'joint' ? 'Gemeinsam' : 'Privat'}</div>
              <div className="acct-name">{account.name}</div>
              <div className="acct-owner">{account.owner}</div>
              <div className="acct-balance">
                {formatEUR(total)}
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}> / Monat</span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Fixkosten {formatEUR(fixed)} · Abos {formatEUR(subscription)}
              </div>
              {cov && (
                <div className="coverage">
                  <span className={`pill ${cov.covered ? 'ok' : 'risk'}`}>
                    {cov.covered ? '✓ gedeckt' : `Lücke ${formatEUR(-cov.delta)}`}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Verteilung {formatEUR(cov.funded)} / Bedarf {formatEUR(cov.needed)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Abschnitt B — Kosten je Person */}
      <h2 className="section-title mt">Kosten je Person <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(pro Monat)</span></h2>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th className="num">Private Kosten</th>
                <th className="num">Verteilung</th>
                <th className="num">Gesamtkosten</th>
                <th className="num">Einkommen</th>
                <th className="num">Überschuss</th>
              </tr>
            </thead>
            <tbody>
              {persons.map((p) => (
                <tr key={p.person}>
                  <td><strong>{p.person}</strong></td>
                  <td className="num">{formatEUR(p.personalCosts)}</td>
                  <td className="num">{formatEUR(p.allocations)}</td>
                  <td className="num">{formatEUR(p.costs)}</td>
                  <td className="num">{formatEUR(p.income)}</td>
                  <td className={`num amount ${p.surplus >= 0 ? 'pos' : 'neg'}`}>{formatEUR(p.surplus)}</td>
                </tr>
              ))}
              {persons.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  Noch keine Personen – lege unter „Meine Daten" Privatkonten mit Inhaber an.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Gesamtkosten = private Fixkosten/Abos + monatliche Verteilung auf die gemeinsamen Konten.
        </p>
      </div>

      {/* Anstehende Posten */}
      <div className="card mt">
        <h2>Anstehende Posten <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(30 Tage)</span></h2>
        {upcoming.length === 0 ? (
          <p className="muted">Keine Posten mit Ausführungstag in den nächsten 30 Tagen.</p>
        ) : (
          <ul className="upcoming">
            {upcoming.map((u) => (
              <li key={u.id}>
                <div className="up-main">
                  <span className="up-recipient">{u.recipient}</span>
                  <span className="up-amount">{formatEUR(u.amount)}</span>
                </div>
                <div className="up-sub muted">
                  {u.daysUntil === 0 ? 'heute' : u.daysUntil === 1 ? 'morgen' : `in ${u.daysUntil} Tagen`}
                  {' · '}{formatDate(u.nextExecution)}
                  {' · '}{RHYTHM_LABELS[u.rhythm] || u.rhythm}
                  {' · '}{u.account?.name || u.accountId}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
