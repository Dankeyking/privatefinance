import { useMemo, useState } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import SankeyFlow from '../components/charts/SankeyFlow.jsx'
import DragCard from '../components/DragCard.jsx'
import Icon from '../components/Icon.jsx'
import { formatEUR, formatDate, toMonthly, RHYTHM_LABELS } from '../lib/normalize.js'
import { upcomingPayments } from '../lib/selectors.js'
import { accountColor, colorMaps } from '../lib/accountColors.js'
import { useDragOrder } from '../lib/layout.js'
import { useMedia } from '../lib/useMedia.js'
import FilterBar from '../components/FilterBar.jsx'
import { applyFilter, isEmptyFilter, normalizeFilter } from '../lib/viewFilter.js'
import {
  householdSummary,
  monthlyByAccount,
  personSummary,
  accountFlows,
} from '../lib/recurring.js'

const BASE_ORDER = ['flow', 'byAccount', 'byPerson', 'upcoming']

export default function Overview({
  data, overrides, onNavigate, filter, onFilterChange, prefs, onSavePreference,
}) {
  // Der Filter wirkt auf alle Abschnitte zugleich: Wir filtern Posten,
  // Einnahmen und Schulden einmal und geben den Selektoren eine Kopie.
  const view = useMemo(() => applyFilter(data, filter, overrides), [data, filter, overrides])
  const filtered = !isEmptyFilter(filter)
  // Ist eine Person gewählt, rechnet die Seite in deren Anteilen – nicht in
  // den vollen Beträgen der Posten, an denen sie beteiligt ist.
  const person = normalizeFilter(filter).person
  const onePerson = person === 'all' ? null : person
  // Ohne Filter gehören auch Konten ohne Posten in die Liste (dass ein Konto
  // nichts trägt, ist eine Aussage). Mit Filter wären das nur noch leere
  // Kacheln, die die eine gesuchte zudecken.
  const byAccount = useMemo(() => {
    const all = monthlyByAccount(view, onePerson)
    return filtered ? all.filter((a) => a.total > 0) : all
  }, [view, filtered, onePerson])
  const allPersons = useMemo(() => personSummary(view), [view])
  const persons = onePerson ? allPersons.filter((p) => p.person === onePerson) : allPersons
  const flows = useMemo(() => accountFlows(view, onePerson), [view, onePerson])

  // Die Haushaltssumme fragt „was kostet der Haushalt". Bei Personenfilter ist
  // die richtige Frage „was kostet es diese Person" – das ist ihr Anteil, dem
  // ihr eigenes Einkommen gegenübersteht.
  const household = useMemo(() => householdSummary(view), [view])
  const summary = useMemo(() => {
    const row = onePerson ? allPersons.find((p) => p.person === onePerson) : null
    if (!row) return household
    const surplus = row.income - row.costs - row.savings - household.debtRepayment
    return {
      totalIncome: row.income,
      totalCosts: row.costs,
      savings: row.savings,
      debtRepayment: household.debtRepayment,
      surplus,
      availableWithoutSavings: row.income - row.costs,
      savingsRate: row.income > 0 ? (row.savings / row.income) * 100 : 0,
    }
  }, [onePerson, allPersons, household])
  const upcoming = useMemo(() => upcomingPayments(view, 30), [view])
  const acctColorByName = useMemo(() => colorMaps(data.accounts).byName, [data.accounts])
  // Bezugsgröße für die Balken auf den Kontokacheln: das teuerste Konto ist voll.
  const maxAccountTotal = useMemo(
    () => byAccount.reduce((m, a) => Math.max(m, a.total), 0),
    [byAccount],
  )
  const debts = view.debts || []
  // Schulden-Abschnitt nur einblenden, wenn tatsächlich welche eingetragen sind.
  const DEFAULT_ORDER = debts.length ? [...BASE_ORDER, 'debts'] : BASE_ORDER
  const { order, api, reset, isCustom } = useDragOrder('overview', DEFAULT_ORDER, prefs, onSavePreference)

  // Ausgewählter Fluss (Kontopaar): Klick in Liste ODER Sankey hebt beides hervor.
  // Am Handy ist das Sankey unlesbar: zehn Beschriftungen werden in eine
  // Flaeche von rund 313 x 320 px gemalt und liegen uebereinander. Dieselbe
  // Information steht darunter als Liste, also wird es dort nur auf Wunsch
  // gezeichnet. 860 px fuer den Zieh-Hinweis, weil dort die Griffe wegfallen.
  const schmal = useMedia('(max-width: 640px)')
  const handyLayout = useMedia('(max-width: 860px)')
  const [zeigeDiagramm, setZeigeDiagramm] = useState(false)

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
              {schmal && (
                <button
                  type="button"
                  className="btn chart-toggle"
                  aria-expanded={zeigeDiagramm}
                  onClick={() => setZeigeDiagramm((v) => !v)}
                >
                  {zeigeDiagramm ? 'Diagramm ausblenden' : 'Diagramm anzeigen'}
                </button>
              )}
              {(!schmal || zeigeDiagramm) && (
                <SankeyFlow
                  flows={flows.flows}
                  nodeColors={flows.nodeColors}
                  columns={flows.columns}
                  labels={flows.labels}
                  selected={selFlow}
                  onSelect={setSelFlow}
                />
              )}
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
        <h2 className="section-title">Kosten je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>
          ({onePerson ? `Anteil ${onePerson}, monatlich` : 'monatlich aufs Konto buchen'})</span></h2>
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
              <div className="acct-bar" aria-hidden="true">
                <span style={{
                  width: `${maxAccountTotal > 0 ? Math.max(2, (total / maxAccountTotal) * 100) : 0}%`,
                  background: accountColor(account, data.accounts),
                }} />
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
    debts: (
      <>
        <h2 className="section-title">Schulden</h2>
        <div className="card clickable" onClick={() => onNavigate?.('debts')} title="Klicken: Schulden bearbeiten">
          <div className="grid kpis" style={{ marginBottom: debts.length ? 14 : 0 }}>
            <KpiCard
              label="Restschulden gesamt"
              value={debts.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0)}
              tone="neg"
              icon="debt"
            />
            <KpiCard
              label="Rate gesamt / Monat"
              value={debts.reduce((s, d) => s + toMonthly(Number(d.rate) || 0, d.rhythm), 0)}
              tone="neg"
            />
          </div>
          <ul className="upcoming">
            {debts.map((d) => (
              <li key={d.id}>
                <div className="up-main">
                  <span className="up-recipient">{d.name}{d.creditor && ` · ${d.creditor}`}</span>
                  <span className="up-amount">{formatEUR(d.remainingAmount)}</span>
                </div>
                <div className="up-sub muted">
                  Rate {formatEUR(d.rate)} {RHYTHM_LABELS[d.rhythm] || d.rhythm}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </>
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

      <FilterBar data={data} value={filter} onChange={onFilterChange} />

      <div className="bento">
        <section className="bento-hero" aria-label="Überschuss pro Monat">
          <div className="bento-hero-label">Überschuss im Monat</div>
          <div className={`bento-hero-value ${summary.surplus >= 0 ? '' : 'neg'}`}>
            {formatEUR(summary.surplus)}
          </div>
          {/* Die Summe ist genau die Rechnung hinter dem Überschuss: Sparen und
              Tilgung gehören dazu, sonst geht die Zahl oben nicht auf. */}
          <p className="bento-hero-sub">
            {formatEUR(summary.totalIncome)} Einnahmen abzüglich{' '}
            {formatEUR(summary.totalCosts + summary.savings + summary.debtRepayment)}{' '}
            {onePerson ? `– ${onePerson}s Anteil an ` : 'für '}
            Fixkosten, Abos, Sparen und Tilgung{filtered && !onePerson ? ' (gefiltert)' : ''}.
          </p>
          <div className="bento-hero-split">
            {persons.map((p) => (
              <button type="button" className="bento-person" key={p.person}
                onClick={() => onNavigate?.('recurring', { person: p.person })}>
                <span className="bento-person-name">{p.person}</span>
                <span className="bento-person-value">{formatEUR(p.costs + p.savings)}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="bento-tile">
          <div className="bento-label">Einnahmen</div>
          <div className="bento-value">{formatEUR(summary.totalIncome)}</div>
          <div className="bento-bar"><span style={{ width: '100%', background: 'var(--pos)' }} /></div>
        </div>

        <div className="bento-tile">
          <div className="bento-label">Fixkosten &amp; Abos</div>
          <div className="bento-value">{formatEUR(summary.totalCosts)}</div>
          <div className="bento-bar">
            <span style={{ width: `${Math.min(100, summary.totalIncome ? (summary.totalCosts / summary.totalIncome) * 100 : 0)}%` }} />
          </div>
        </div>

        <div className="bento-tile">
          <div className="bento-label">davon Sparen</div>
          <div className="bento-value">{formatEUR(summary.savings)}</div>
          <div className="bento-hint">Sparquote {summary.savingsRate.toFixed(0)} %</div>
        </div>

        <div className="bento-tile">
          <div className="bento-label">Schulden-Tilgung</div>
          <div className="bento-value">{formatEUR(summary.debtRepayment)}</div>
          <div className="bento-hint">ohne Sparen frei: {formatEUR(summary.availableWithoutSavings)}</div>
        </div>
      </div>

      {/* Ohne den Hinweis bliebe am Handy eine leere Zeile mit Abstand stehen. */}
      {(!handyLayout || isCustom) && (
      <div className="editor-head mt" style={{ alignItems: 'baseline' }}>
        {!handyLayout && (
          <span className="muted" style={{ fontSize: 12 }}>Ziehe die Griffe (⠿), um Abschnitte umzusortieren.</span>
        )}
        {isCustom && <button className="btn" onClick={reset}>Layout zurücksetzen</button>}
      </div>
      )}
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
