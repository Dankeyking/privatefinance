import { useMemo } from 'react'
import TimingChart from '../components/charts/TimingChart.jsx'
import Icon from '../components/Icon.jsx'
import { buildPaymentSchedule } from '../lib/timing.js'
import { formatEUR, RHYTHM_LABELS } from '../lib/normalize.js'

export default function Timing({ data }) {
  const sched = useMemo(() => buildPaymentSchedule(data), [data])

  if (!sched || sched.events.length === 0) {
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

  const ok = sched.requiredBuffer === 0
  const status = ok ? 'ok' : sched.covered ? 'warn' : 'risk'

  return (
    <div>
      <div className="page-header">
        <h1>Zahlungslauf</h1>
        <p>
          Kette Privatkonto → Beitrag → Gemeinschaftskonto → Lastschrift/Dauerauftrag.
          Ist das Geld rechtzeitig da, bevor die Buchungen abgehen?
        </p>
      </div>

      {/* Verdikt-Banner */}
      <div className={`verdict ${status}`}>
        <div className="verdict-icon">
          <Icon name={status === 'ok' ? 'check' : 'alert'} size={26} />
        </div>
        <div>
          <div className="verdict-title">
            {status === 'ok' && 'Alles im grünen Bereich'}
            {status === 'warn' && 'Gedeckt – aber knapp getaktet'}
            {status === 'risk' && 'Achtung: Deckung reicht nicht'}
          </div>
          <div className="verdict-text">
            {status === 'ok' &&
              'Die Beiträge kommen rechtzeitig an, bevor die Buchungen abgehen – kein Puffer nötig.'}
            {status === 'warn' && (
              <>
                Einige Buchungen (z. B. <strong>{sched.firstRisk?.label}</strong> am{' '}
                {sched.firstRisk?.day}.) gehen ab, <em>bevor</em> die Beiträge da sind. Dafür
                braucht das Gemeinschaftskonto <strong>{formatEUR(sched.requiredBuffer)}</strong>{' '}
                Puffer – vorhanden sind {formatEUR(sched.jointBalance)}. Tipp: Beitrag früher
                überweisen, dann reicht weniger.
              </>
            )}
            {status === 'risk' && (
              <>
                Buchungen wie <strong>{sched.firstRisk?.label}</strong> am {sched.firstRisk?.day}.
                gehen ab, bevor genug Geld da ist. Nötiger Puffer{' '}
                <strong>{formatEUR(sched.requiredBuffer)}</strong>, vorhanden nur{' '}
                {formatEUR(sched.jointBalance)}.
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid kpis mt">
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
        </div>
      </div>

      <div className="card mt">
        <h2>Saldoverlauf im Monat <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(nur Beiträge, ab 0 € – rote Fläche = ohne Puffer ungedeckt)</span></h2>
        <TimingChart labels={sched.timelineLabels} flowOnly={sched.flowOnly} events={sched.events} />
      </div>

      <div className="card mt">
        <h2>Ablauf in Reihenfolge</h2>
        <ol className="timeline">
          {sched.events.map((e, i) => {
            const risk = e.kind === 'out' && !e.funded
            return (
              <li key={i} className={`timeline-item ${e.kind} ${risk ? 'risk' : ''}`}>
                <div className="tl-marker">
                  <span className="tl-day">{e.day}.</span>
                </div>
                <div className="tl-content">
                  <div className="tl-row">
                    <span className="tl-label">
                      <Icon name={e.kind === 'in' ? 'plus' : 'minus'} size={15} />
                      {e.kind === 'in'
                        ? `Beitrag von ${e.from}`
                        : `Lastschrift/DA → ${e.label}`}
                    </span>
                    <span className={`tl-amount ${e.kind === 'in' ? 'pos' : 'neg'}`}>
                      {e.kind === 'in' ? '+' : '−'}{formatEUR(e.amount)}
                    </span>
                  </div>
                  <div className="tl-sub">
                    <span className="muted">
                      Saldo danach: {formatEUR(e.balanceAfter)} · {RHYTHM_LABELS[e.rhythm] || e.rhythm}
                    </span>
                    {e.kind === 'out' &&
                      (e.funded ? (
                        <span className="pill ok">aus Beiträgen gedeckt</span>
                      ) : (
                        <span className="pill risk">läuft vor dem Beitrag</span>
                      ))}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
