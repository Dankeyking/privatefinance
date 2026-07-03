import { useMemo, useState } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import SankeyFlow from '../components/charts/SankeyFlow.jsx'
import DragCard from '../components/DragCard.jsx'
import Icon from '../components/Icon.jsx'
import { formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import { upcomingPayments } from '../lib/selectors.js'
import { accountColor, colorMaps } from '../lib/accountColors.js'
import { useDragOrder } from '../lib/layout.js'
import {
  householdSummary,
  monthlyByAccount,
  personSummary,
  accountFlows,
} from '../lib/recurring.js'

const DEFAULT_ORDER = ['flow', 'byAccount', 'byPerson', 'upcoming']

export default function Overview({ data, onNavigate }) {
  const summary = useMemo(() => householdSummary(data), [data])
  const byAccount = useMemo(() => monthlyByAccount(data), [data])
  const persons = useMemo(() => personSummary(data), [data])
  const flows = useMemo(() => accountFlows(data), [data])
  const upcoming = useMemo(() => upcomingPayments(data, 30), [data])
  const acctColorByName = useMemo(() => colorMaps(data.accounts).byName, [data.accounts])
  const { order, api, reset, isCustom } = useDragOrder('overview', DEFAULT_ORDER)

  // Ausgewählter Fluss (Kontopaar): Klick in Liste ODER Sankey hebt beides hervor.
  const [selFlow, setSelFlow] = useState(null) // { from, to } | null
  const flowMatches = (f) => selFlow && f.from === selFlow.from && f.to === selFlow.to
  const toggleFlow = (f) => setSelFlow(flowMatches(f) ? null : { from: f.from, to: f.to })

  const sections = {
    flow: (
      <>
        <h2 className="section-title">Geldfluss zwischen den Konten <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(pro Monat)</span></h2>
        <div className="card">
          {flows.flows.length === 0 ? (
            <p className="muted">
              Noch keine Aufteilung auf Personen hinterlegt. Trage unter „Kosten &amp; Abos"
              Posten mit Aufteilung ein – dann zeigt sich hier, wer wie viel auf welches Konto bucht.
            </p>
          ) : (
            <div>
              <SankeyFlow
                flows={flows.flows}
                nodeColors={flows.nodeColors}
                columns={flows.columns}
                labels={flows.labels}
                selected={selFlow}
                onSelect={setSelFlow}
              />
              <div>
                <div className="flow-list">
                  {flows.rows.map((f, i) => (
                    <button
                      key={i}
                      className={`flow-item ${flowMatches(f) ? 'sel' : selFlow ? 'dim' : ''}`}
                      onClick={() => toggleFlow(f)}
                      title="Klicken, um den Fluss im Diagramm hervorzuheben"
                    >
                      <span className="flow-route">
                        <span className="flow-endpoint">
                          <span className="acct-dot" style={{ background: acctColorByName[f.from] }} />
                          {f.from}
                        </span>
                        <span className="flow-arrow">→</span>
                        <span className="flow-endpoint">
                          <span className="acct-dot" style={{ background: acctColorByName[f.to] }} />
                          {f.to}
                        </span>
                        {f.kind === 'umbuchung' && <span className="pill umbuchung">Umbuchung</span>}
                      </span>
                      <span className="flow-amount">{formatEUR(f.flow)}</span>
                    </button>
                  ))}
                  <div className="flow-total">
                    <span>Summe</span>
                    <span className="flow-amount">{formatEUR(flows.total)}</span>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                  Klicke eine Zeile oder einen Fluss im Diagramm, um ihn hervorzuheben.
                  {selFlow && <> <button className="link-btn" onClick={() => setSelFlow(null)}>Auswahl aufheben</button></>}
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    ),
    byAccount: (
      <>
        <h2 className="section-title">Kosten je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(monatlich aufs Konto buchen)</span></h2>
        <div className="grid accounts">
          {byAccount.map(({ account, fixed, subscription, savings, reserve, total }) => (
            <div className={`card acct clickable ${account.type}`} key={account.id}
              style={{ '--acct-color': accountColor(account, data.accounts) }}
              onClick={() => onNavigate?.('recurring', { accountId: account.id })}
              title="Klicken: Posten dieses Kontos in Kosten & Abos anzeigen">
              <div className="acct-type">{account.type === 'joint' ? 'Gemeinsam' : 'Privat'}</div>
              <div className="acct-name">{account.name}</div>
              <div className="acct-balance">
                {formatEUR(total)}
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}> / Monat</span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{formatEUR(total * 12)} / Jahr</div>
              {total > 0 && (
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {[
                    fixed > 0 && `Fixkosten ${formatEUR(fixed)}`,
                    subscription > 0 && `Abos ${formatEUR(subscription)}`,
                    savings > 0 && `Sparen ${formatEUR(savings)}`,
                  ].filter(Boolean).join(' · ')}
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
      </>
    ),
    byPerson: (
      <>
        <h2 className="section-title">Kosten je Person <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(pro Monat)</span></h2>
        <div className="card">
          <div className="table-wrap">
            <table className="resp-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="num">Kosten</th>
                  <th className="num">Sparen</th>
                  <th className="num">Einkommen</th>
                  <th className="num">Überschuss</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((p) => (
                  <tr key={p.person} className="clickable" title="Klicken: Posten dieser Person anzeigen"
                    onClick={() => onNavigate?.('recurring', { person: p.person })}>
                    <td data-label="Person"><strong>{p.person}</strong></td>
                    <td className="num" data-label="Kosten">{formatEUR(p.costs)}</td>
                    <td className="num" data-label="Sparen">{formatEUR(p.savings)}</td>
                    <td className="num" data-label="Einkommen">{formatEUR(p.income)}</td>
                    <td className={`num amount ${p.surplus >= 0 ? 'pos' : 'neg'}`} data-label="Überschuss">{formatEUR(p.surplus)}</td>
                  </tr>
                ))}
                {persons.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    Noch keine Personen – lege unter „Meine Daten" Privatkonten mit Inhaber an.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Kosten = Anteil an Fixkosten/Abos · Sparen = Anteil an Rücklagen · Überschuss = Einkommen − Kosten − Sparen.
          </p>
        </div>
      </>
    ),
    upcoming: (
      <div className="card">
        <h2>Anstehende Posten <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(30 Tage)</span></h2>
        {upcoming.length === 0 ? (
          <p className="muted">Keine Posten mit Ausführungstag in den nächsten 30 Tagen.</p>
        ) : (
          <ul className="upcoming">
            {upcoming.map((u) => (
              <li key={u.id} className="clickable" title="Klicken: Posten in Kosten & Abos öffnen"
                onClick={() => onNavigate?.('recurring', { search: u.recipient })}>
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
    ),
  }

  return (
    <div>
      <div className="page-header with-actions">
        <div>
          <h1>Übersicht</h1>
          <p>Dein Haushalt auf einen Blick – pro Konto der monatlich zu buchende Betrag (jährliche Posten ÷ 12).</p>
        </div>
        <button className="btn header-action" onClick={() => onNavigate?.('recurring')}>
          <Icon name="standing" size={15} /> Kosten &amp; Abos bearbeiten
        </button>
      </div>

      <div className="grid kpis">
        <KpiCard label="Einnahmen / Monat" value={summary.totalIncome} tone="pos" icon="plus" />
        <KpiCard label="Fixkosten & Abos / Monat" value={summary.totalCosts} tone="neg" icon="minus" />
        <KpiCard label="Sparen / Monat" value={summary.savings} icon="budget" hint={`Sparquote ${summary.savingsRate.toFixed(0)} %`} />
        <KpiCard
          label="Überschuss / Monat"
          value={summary.surplus}
          tone={summary.surplus >= 0 ? 'pos' : 'neg'}
          icon="check"
          hint={`ohne Sparen: ${formatEUR(summary.availableWithoutSavings)}`}
        />
      </div>

      <div className="editor-head mt" style={{ alignItems: 'baseline' }}>
        <span className="muted" style={{ fontSize: 12 }}>Ziehe die Griffe (⠿), um Abschnitte umzusortieren.</span>
        {isCustom && <button className="btn" onClick={reset}>Layout zurücksetzen</button>}
      </div>
      <div className="drag-grid mt">
        {order.map((id) => (
          <DragCard key={id} id={id} api={api} full>
            {sections[id]}
          </DragCard>
        ))}
      </div>
    </div>
  )
}
