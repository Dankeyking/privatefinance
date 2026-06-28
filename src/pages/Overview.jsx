import { useMemo } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import SankeyFlow from '../components/charts/SankeyFlow.jsx'
import { formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import { upcomingPayments } from '../lib/selectors.js'
import {
  householdSummary,
  monthlyByAccount,
  personSummary,
  accountFlows,
} from '../lib/recurring.js'

export default function Overview({ data }) {
  const summary = useMemo(() => householdSummary(data), [data])
  const byAccount = useMemo(() => monthlyByAccount(data), [data])
  const persons = useMemo(() => personSummary(data), [data])
  const flows = useMemo(() => accountFlows(data), [data])
  const upcoming = useMemo(() => upcomingPayments(data, 30), [data])

  return (
    <div>
      <div className="page-header">
        <h1>Übersicht</h1>
        <p>Manuelle Fixkosten-Übersicht – pro Konto der monatlich zu buchende Betrag (jährliche Posten ÷ 12).</p>
      </div>

      <div className="grid kpis">
        <KpiCard label="Einnahmen / Monat" value={summary.totalIncome} tone="pos" />
        <KpiCard label="Fixkosten & Abos / Monat" value={summary.totalCosts} tone="neg" />
        <KpiCard label="Überschuss / Monat" value={summary.surplus} tone={summary.surplus >= 0 ? 'pos' : 'neg'} />
      </div>

      {/* Geldfluss zwischen den Konten */}
      <h2 className="section-title mt">Geldfluss zwischen den Konten <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(pro Monat)</span></h2>
      <div className="card">
        {flows.flows.length === 0 ? (
          <p className="muted">
            Noch keine Verteilung hinterlegt. Lege unter „Meine Daten" fest, wer nach dem Gehalt
            wie viel von einem Privatkonto auf ein gemeinsames Konto bucht.
          </p>
        ) : (
          <div className="grid flow-row">
            <div>
              <SankeyFlow
                flows={flows.flows}
                nodeColors={flows.nodeColors}
                columns={flows.columns}
                labels={flows.labels}
              />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Von</th><th>Nach</th><th className="num">€ / Monat</th></tr>
                </thead>
                <tbody>
                  {flows.flows.map((f, i) => (
                    <tr key={i}>
                      <td>{f.from}</td>
                      <td>{f.to}</td>
                      <td className="num">{formatEUR(f.flow)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}><strong>Summe</strong></td>
                    <td className="num"><strong>{formatEUR(flows.total)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Abschnitt A — Kosten je Konto */}
      <h2 className="section-title mt">Kosten je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(monatlich aufs Konto buchen)</span></h2>
      <div className="grid accounts">
        {byAccount.map(({ account, fixed, subscription, reserve, total }) => (
          <div className={`card acct ${account.type}`} key={account.id}>
            <div className="acct-type">{account.type === 'joint' ? 'Gemeinsam' : 'Privat'}</div>
            <div className="acct-name">{account.name}</div>
            <div className="acct-balance">
              {formatEUR(total)}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}> / Monat</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{formatEUR(total * 12)} / Jahr</div>
            {(fixed > 0 || subscription > 0) && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Fixkosten {formatEUR(fixed)} · Abos {formatEUR(subscription)}
              </div>
            )}
            {reserve > 0 && (
              <div className="reserve-hint">
                inkl. {formatEUR(reserve)}/Monat Rücklage für jährliche/vierteljährliche Posten
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Abschnitt B — Kosten je Person */}
      <h2 className="section-title mt">Kosten je Person <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(pro Monat)</span></h2>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th className="num">Gesamtkosten</th>
                <th className="num">Einkommen</th>
                <th className="num">Überschuss</th>
              </tr>
            </thead>
            <tbody>
              {persons.map((p) => (
                <tr key={p.person}>
                  <td><strong>{p.person}</strong></td>
                  <td className="num">{formatEUR(p.costs)}</td>
                  <td className="num">{formatEUR(p.income)}</td>
                  <td className={`num amount ${p.surplus >= 0 ? 'pos' : 'neg'}`}>{formatEUR(p.surplus)}</td>
                </tr>
              ))}
              {persons.length === 0 && (
                <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  Noch keine Personen – lege unter „Meine Daten" Privatkonten mit Inhaber an.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Gesamtkosten = Summe der Anteile jeder Person an allen Fixkosten/Abos (gemäß Aufteilung).
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
