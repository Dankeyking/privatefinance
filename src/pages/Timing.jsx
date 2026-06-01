import { useMemo } from 'react'
import TimingChart from '../components/charts/TimingChart.jsx'
import { buildPaymentSchedule } from '../lib/timing.js'
import { formatEUR, RHYTHM_LABELS } from '../lib/normalize.js'

export default function Timing({ data }) {
  const sched = useMemo(() => buildPaymentSchedule(data), [data])

  if (!sched) {
    return (
      <div>
        <div className="page-header"><h1>Zahlungslauf</h1></div>
        <p className="muted">Kein Gemeinschaftskonto gefunden.</p>
      </div>
    )
  }

  if (sched.events.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Zahlungslauf</h1>
          <p>Timing-Check der Daueraufträge übers Gemeinschaftskonto.</p>
        </div>
        <div className="card">
          <p className="muted">
            Noch keine Beiträge/Daueraufträge mit Ausführungstag hinterlegt. Mit echten Daten
            bitte die Haushaltsbeiträge (Privat → Gemeinschaft) und Ausführungstage pflegen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Zahlungslauf</h1>
        <p>
          Kette Privatkonto → Beitrag → Gemeinschaftskonto → Lastschrift/Dauerauftrag.
          Ist das Geld rechtzeitig da, bevor die Buchungen abgehen?
        </p>
      </div>

      <div className="grid kpis">
        <div className="card kpi">
          <div className="kpi-label">Beiträge / Monat</div>
          <div className="kpi-value pos">{formatEUR(sched.totalIn)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Fixkosten Gemeinschaft</div>
          <div className="kpi-value neg">{formatEUR(sched.totalOut)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Nötiger Mindest-Puffer</div>
          <div className="kpi-value">{formatEUR(sched.requiredBuffer)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Aktueller Saldo</div>
          <div className={`kpi-value ${sched.covered ? 'pos' : 'neg'}`}>{formatEUR(sched.jointBalance)}</div>
          <div className={`kpi-trend ${sched.covered ? 'pos' : 'neg'}`}>
            {sched.covered ? '✓ rechtzeitig gedeckt' : '⚠ Puffer reicht nicht'}
          </div>
        </div>
      </div>

      <div className={`card mt timing-banner ${sched.covered ? 'ok' : 'risk'}`}>
        {sched.requiredBuffer === 0 ? (
          <span>
            ✓ Alle Buchungen sind durch die Beiträge gedeckt – die Reihenfolge passt, kein
            Puffer nötig.
          </span>
        ) : sched.covered ? (
          <span>
            ✓ Gedeckt. Einige Buchungen (z. B. <strong>{sched.firstRisk?.label}</strong> am{' '}
            {sched.firstRisk?.day}.) gehen ab, <em>bevor</em> die Beiträge da sind – das
            Gemeinschaftskonto braucht dafür <strong>{formatEUR(sched.requiredBuffer)}</strong>{' '}
            Puffer. Aktuell vorhanden: {formatEUR(sched.jointBalance)}. Tipp: Beitrag früher
            überweisen, dann reicht weniger Puffer.
          </span>
        ) : (
          <span>
            ⚠ Risiko: Buchungen wie <strong>{sched.firstRisk?.label}</strong> am{' '}
            {sched.firstRisk?.day}. gehen ab, bevor genug Geld da ist. Nötiger Puffer{' '}
            <strong>{formatEUR(sched.requiredBuffer)}</strong>, vorhanden nur{' '}
            {formatEUR(sched.jointBalance)}. Beitrag früher überweisen oder Buchungstermine
            nach hinten legen.
          </span>
        )}
      </div>

      <div className="card mt">
        <h2>Saldoverlauf im Monat (nach Ausführungstag)</h2>
        <TimingChart
          labels={sched.timelineLabels}
          flowOnly={sched.flowOnly}
          withBuffer={sched.withBuffer}
        />
      </div>

      <div className="card mt">
        <h2>Ablauf in Reihenfolge</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tag</th>
                <th>Vorgang</th>
                <th className="num">Betrag</th>
                <th className="num">Saldo (ab 0 €)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sched.events.map((e, i) => (
                <tr key={i} className={e.kind === 'out' && !e.funded ? 'not-joint' : ''}>
                  <td><strong>{e.day}.</strong></td>
                  <td>
                    {e.kind === 'in'
                      ? `Beitrag von ${e.from}`
                      : `Lastschrift/DA → ${e.label}`}
                    <span className="muted" style={{ fontSize: 12 }}>
                      {' '}· {RHYTHM_LABELS[e.rhythm] || e.rhythm}
                    </span>
                  </td>
                  <td className={`num amount ${e.kind === 'in' ? 'pos' : 'neg'}`}>
                    {e.kind === 'in' ? '+' : '−'}{formatEUR(e.amount)}
                  </td>
                  <td className="num">{formatEUR(e.balanceAfter)}</td>
                  <td>
                    {e.kind === 'in'
                      ? '—'
                      : e.funded
                        ? '✓ aus Beiträgen gedeckt'
                        : '⚠ vor Beitrag / nur aus Puffer'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
