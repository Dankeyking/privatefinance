import { useEffect, useMemo, useState } from 'react'
import { makeNewOrder, formToOrder, parseAmountDE } from '../lib/orderForm.js'
import { toMonthly, formatEUR, RHYTHM_LABELS } from '../lib/normalize.js'
import { isOrderActive } from '../lib/selectors.js'
import { personShareMonthly } from '../lib/recurring.js'
import { accountColor } from '../lib/accountColors.js'
import { categoryLabel, getCategories } from '../lib/categoryStore.js'

// =============================================================================
//  CostsMobile — „Kosten & Abos" am Handy, eigener Aufbau statt Tabelle
// =============================================================================
//  Die Tabelle wurde am Handy Zeile für Zeile zu einer Karte mit acht
//  beschrifteten Feldern. Bei 30 Posten waren das 12.080 px Seitenhöhe, also
//  knapp fünfzehn Bildschirme, und die Beschriftungen („EMPFÄNGER", „BETRAG" …)
//  wiederholten sich dreißigmal. Man sah nie mehr als einen Posten auf einmal.
//
//  Hier steht deshalb eine Liste: eine Zeile je Posten mit dem, wonach man
//  sucht — wer und wie viel im Monat — gruppiert nach Kategorie, mit Summe je
//  Gruppe. Alles Übrige liegt in einer Schublade, die auf Tippen aufgeht.
//  Das ist bewusst nicht der Aufbau vom Rechner: dort ist die Tabelle mit
//  ihren acht Spalten und dem Sortieren je Spalte genau richtig.
// =============================================================================

const RHYTHMS = [
  { id: 'monthly', label: 'monatlich' },
  { id: 'quarterly', label: 'vierteljährlich' },
  { id: 'yearly', label: 'jährlich' },
]

const SPLIT_MODES = [
  { id: 'even', label: 'gleich' },
  { id: 'single', label: 'eine Person' },
  { id: 'amount', label: 'Beträge' },
  { id: 'percent', label: 'Prozent' },
]

const ARTEN = [
  { id: 'fixed', label: 'Fixkosten' },
  { id: 'subscription', label: 'Abo' },
]

export default function CostsMobile({ accounts, persons, orders, onChange, filter = () => true }) {
  const sichtbar = orders.filter(filter)
  const [offen, setOffen] = useState(null)        // id des Postens in der Schublade
  const [schliesst, setSchliesst] = useState(false)
  const [zu, setZu] = useState(() => new Set())   // eingeklappte Gruppen
  const kategorien = getCategories()

  const kontoVon = (id) => accounts.find((a) => a.id === id)
  const monatlich = (o) => toMonthly(parseAmountDE(o.amount), o.rhythm)

  const set = (id, feld, wert) =>
    onChange(orders.map((r) => (r.id === id ? { ...r, [feld]: wert } : r)))
  const setAnteil = (id, person, wert) =>
    onChange(orders.map((r) => (r.id === id ? { ...r, splitShares: { ...r.splitShares, [person]: wert } } : r)))

  function schliessen() {
    setSchliesst(true)
    window.setTimeout(() => { setSchliesst(false); setOffen(null) }, 200)
  }

  const loeschen = (id) => { onChange(orders.filter((r) => r.id !== id)); schliessen() }

  // Nach Kategorie gruppieren, teuerste Gruppe zuerst — so steht oben, was
  // wirklich ins Gewicht fällt, statt alphabetischer Zufall.
  const gruppen = useMemo(() => {
    const map = new Map()
    sichtbar.forEach((o) => {
      const k = o.category || 'Sonstiges'
      if (!map.has(k)) map.set(k, { key: k, posten: [], summe: 0 })
      const g = map.get(k)
      g.posten.push(o)
      if (isOrderActive(o)) g.summe += monatlich(o)
    })
    const liste = [...map.values()]
    liste.forEach((g) => g.posten.sort((a, b) => monatlich(b) - monatlich(a)))
    return liste.sort((a, b) => b.summe - a.summe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, filter])

  useEffect(() => {
    if (offen == null) return
    const aufTaste = (e) => { if (e.key === 'Escape') schliessen() }
    window.addEventListener('keydown', aufTaste)
    return () => window.removeEventListener('keydown', aufTaste)
  }, [offen])

  const posten = orders.find((o) => o.id === offen)

  // Zweite Zeile einer Listenzeile: nur was nicht ohnehin aus der Gruppe
  // hervorgeht. Die Kategorie steht in der Überschrift, also hier nicht.
  const untertitel = (o) => {
    const teile = []
    if (o.rhythm !== 'monthly') {
      teile.push(`${formatEUR(parseAmountDE(o.amount))} ${RHYTHM_LABELS[o.rhythm] || o.rhythm}`)
    }
    if (o.kind === 'subscription') teile.push('Abo')
    const konto = kontoVon(o.accountId)
    if (konto) teile.push(konto.name)
    return teile.join(' · ')
  }

  const anteilText = (o) => {
    const fertig = formToOrder(o, persons)
    const teile = persons
      .map((p) => ({ p, m: personShareMonthly(fertig, p, persons) }))
      .filter((x) => x.m > 0.005)
      .map((x) => `${x.p} ${formatEUR(x.m)}`)
    return teile.join(' · ') || '—'
  }

  const umschalten = (key) => setZu((s) => {
    const n = new Set(s)
    if (n.has(key)) n.delete(key)
    else n.add(key)
    return n
  })

  return (
    <div className="cm">
      {gruppen.length === 0 && (
        <p className="muted" style={{ padding: '18px 0' }}>Keine Posten für diese Auswahl.</p>
      )}

      {gruppen.map((g) => {
        const eingeklappt = zu.has(g.key)
        return (
          <section key={g.key} className="cm-group">
            <button
              type="button"
              className="cm-group-head"
              aria-expanded={!eingeklappt}
              onClick={() => umschalten(g.key)}
            >
              <span className={`cm-caret ${eingeklappt ? 'zu' : ''}`} aria-hidden="true">▾</span>
              <span className="cm-group-name">{categoryLabel(g.key)}</span>
              <span className="cm-group-count">{g.posten.length}</span>
              <span className="cm-group-sum">{formatEUR(g.summe)}</span>
            </button>

            {!eingeklappt && (
              <ul className="cm-list">
                {g.posten.map((o) => {
                  const konto = kontoVon(o.accountId)
                  const sub = untertitel(o)
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        className={`cm-row ${isOrderActive(o) ? '' : 'beendet'}`}
                        onClick={() => setOffen(o.id)}
                      >
                        <span
                          className="cm-dot"
                          style={{ background: konto ? accountColor(konto, accounts) : 'transparent' }}
                        />
                        <span className="cm-text">
                          <span className="cm-name">{o.recipient || 'Ohne Namen'}</span>
                          {sub && <span className="cm-sub">{sub}</span>}
                        </span>
                        <span className="cm-amount">{formatEUR(monatlich(o))}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}

      <button
        type="button"
        className="btn cm-add"
        onClick={() => {
          const neu = makeNewOrder('fixed', accounts)
          onChange([...orders, neu])
          setOffen(neu.id)
        }}
      >
        + Neuer Posten
      </button>

      {posten && (
        <>
          <div className={`sheet-backdrop ${schliesst ? 'out' : ''}`} onClick={schliessen} />
          <div
            className={`filter-sheet ${schliesst ? 'out' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Posten bearbeiten"
          >
            <div className="sheet-head">
              <strong>{posten.recipient || 'Neuer Posten'}</strong>
              <button type="button" className="btn" onClick={schliessen}>Fertig</button>
            </div>

            <div className="sheet-body cm-form">
              <label className="cm-field">
                <span>Empfänger</span>
                <input
                  value={posten.recipient}
                  placeholder="z. B. Miete"
                  onChange={(e) => set(posten.id, 'recipient', e.target.value)}
                />
              </label>

              <div className="cm-pair">
                <label className="cm-field">
                  <span>Betrag</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={posten.amount}
                    placeholder="0,00"
                    onChange={(e) => set(posten.id, 'amount', e.target.value)}
                  />
                </label>
                <label className="cm-field">
                  <span>Rhythmus</span>
                  <select value={posten.rhythm} onChange={(e) => set(posten.id, 'rhythm', e.target.value)}>
                    {RHYTHMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
              </div>

              {posten.rhythm !== 'monthly' && (
                <p className="cm-note">Macht {formatEUR(monatlich(posten))} im Monat.</p>
              )}

              <div className="cm-field">
                <span>Art</span>
                <div className="cm-seg">
                  {ARTEN.map((k) => (
                    <button
                      type="button"
                      key={k.id}
                      className={`chip ${posten.kind === k.id ? 'on' : ''}`}
                      aria-pressed={posten.kind === k.id}
                      onClick={() => set(posten.id, 'kind', k.id)}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cm-pair">
                <label className="cm-field">
                  <span>Konto</span>
                  <select value={posten.accountId} onChange={(e) => set(posten.id, 'accountId', e.target.value)}>
                    <option value="">—</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <label className="cm-field">
                  <span>Kategorie</span>
                  <select value={posten.category} onChange={(e) => set(posten.id, 'category', e.target.value)}>
                    {kategorien.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="cm-field">
                <span>Aufteilung</span>
                <div className="cm-seg">
                  {SPLIT_MODES.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      className={`chip ${posten.splitMode === m.id ? 'on' : ''}`}
                      aria-pressed={posten.splitMode === m.id}
                      onClick={() => set(posten.id, 'splitMode', m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {posten.splitMode === 'single' && (
                <label className="cm-field">
                  <span>Wer zahlt</span>
                  <select
                    value={posten.splitPerson || persons[0] || ''}
                    onChange={(e) => set(posten.id, 'splitPerson', e.target.value)}
                  >
                    {persons.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              )}

              {(posten.splitMode === 'amount' || posten.splitMode === 'percent') && (
                <div className="cm-pair">
                  {persons.map((p) => (
                    <label className="cm-field" key={p}>
                      <span>{p}{posten.splitMode === 'percent' ? ' (%)' : ' (€)'}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={posten.splitShares?.[p] ?? ''}
                        onChange={(e) => setAnteil(posten.id, p, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              )}

              <p className="cm-note">Je Monat: {anteilText(posten)}</p>

              <label className="cm-field">
                <span>Ende <span className="muted">(leer = offen)</span></span>
                <input
                  type="date"
                  value={posten.endDate || ''}
                  onChange={(e) => set(posten.id, 'endDate', e.target.value)}
                />
              </label>

              <button type="button" className="btn cm-delete" onClick={() => loeschen(posten.id)}>
                Posten löschen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
