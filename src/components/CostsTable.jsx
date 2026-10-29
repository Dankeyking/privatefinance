import { useEffect, useMemo, useRef, useState } from 'react'
import CategoryTag from './CategoryTag.jsx'
import SortTh from './SortTh.jsx'
import { makeNewOrder, formToOrder, parseAmountDE } from '../lib/orderForm.js'
import { toMonthly, formatEUR, formatDate, RHYTHM_LABELS, MONTH_NAMES_SHORT } from '../lib/normalize.js'
import { isOrderActive, monthsRemaining } from '../lib/selectors.js'
import { personShareMonthly } from '../lib/recurring.js'
import { accountColor } from '../lib/accountColors.js'
import { categoryLabel } from '../lib/categoryStore.js'
import { sortRows, nextSortState } from '../lib/sorting.js'

const RHYTHMS = ['monthly', 'quarterly', 'yearly']
const RHYTHM_RANK = { monthly: 0, quarterly: 1, yearly: 2 }
const KIND_LABEL = { fixed: 'Fixkosten', subscription: 'Abo', savings: 'Sparen' }
const kindClass = (k) => (k === 'savings' ? 'sav' : k === 'subscription' ? 'sub' : 'fix')

// Click-to-Edit-Tabelle: schöne, formatierte Ansicht; Klick auf eine Zelle
// macht genau dieses Feld editierbar. Voll kontrolliert (orders/onChange).
export default function CostsTable({ accounts, persons, orders, onChange, filter = () => true }) {
  const visible = orders.filter(filter)
  const [edit, setEdit] = useState(null) // { id, field }
  // Vorsortiert nach Monatsbetrag, absteigend. Ohne das kam die Liste in der
  // Reihenfolge, in der die Posten angelegt wurden: die Miete mit 1.180 € stand
  // zwischen einer Spende mit 25 € und sah genauso aus. Wer die Seite oeffnet,
  // will zuerst wissen, was weh tut.
  const [sort, setSort] = useState({ key: 'amount', dir: 'desc' })
  const cellRef = useRef(null)

  useEffect(() => {
    if (!edit) return
    const onDown = (e) => { if (cellRef.current && !cellRef.current.contains(e.target)) setEdit(null) }
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') setEdit(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [edit])

  const set = (id, field, value) => onChange(orders.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  const setShare = (id, p, value) =>
    onChange(orders.map((r) => (r.id === id ? { ...r, splitShares: { ...r.splitShares, [p]: value } } : r)))
  const del = (id) => onChange(orders.filter((r) => r.id !== id))
  const add = (kind) => onChange([...orders, makeNewOrder(kind, accounts)])

  const isEd = (id, field) => edit && edit.id === id && edit.field === field
  const open = (id, field) => (e) => { e.stopPropagation(); setEdit({ id, field }) }

  const accById = (id) => accounts.find((a) => a.id === id)
  const accName = (id) => accById(id)?.name || '—'
  const accColor = (id) => accountColor(accById(id), accounts)
  const monthly = (o) => toMonthly(parseAmountDE(o.amount), o.rhythm)
  const splitParts = (o) => {
    const cost = formToOrder(o, persons)
    return persons
      .map((p) => ({ p, m: personShareMonthly(cost, p, persons) }))
      .filter((x) => x.m > 0.005)
  }
  const splitText = (o) => splitParts(o).map((x) => `${x.p} ${formatEUR(x.m)}`).join(' · ') || '—'
  // Kurzfassung fuer die Zelle. „Mika 590,00 € · Noa 590,00 €" stand in jeder
  // Zeile und sagte bei gleicher Teilung nichts, was „geteilt" nicht schon
  // sagt - die Spalte war dadurch doppelt so breit wie die mit dem Namen des
  // Postens. Der volle Wortlaut haengt als Tooltip daran.
  const splitKurz = (o) => {
    const parts = splitParts(o)
    if (parts.length === 0) return '—'
    if (parts.length === 1) return `nur ${parts[0].p}`
    const gleich = parts.every((x) => Math.abs(x.m - parts[0].m) < 0.005)
    if (gleich) return `je ${formatEUR(parts[0].m)}`
    return splitText(o)
  }

  const sorted = useMemo(() => {
    if (!sort.key) return visible
    return sortRows(visible, sort.key, sort.dir, (o, key) => {
      switch (key) {
        // Monatsbetrag, nicht der eingetippte Wert: 486 € jaehrlich sind
        // 40,50 € im Monat und gehoeren unter einen 300-€-Sparplan.
        case 'amount': return monthly(o)
        case 'rhythm': return RHYTHM_RANK[o.rhythm] ?? 0
        case 'kind': return KIND_LABEL[o.kind] || 'Fixkosten'
        case 'split': return splitText(o)
        case 'accountId': return accName(o.accountId)
        case 'category': return categoryLabel(o.category)
        default: return o[key] || ''
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sort, accounts, persons])
  const onSort = (key, numeric) => setSort((s) => nextSortState(s, key, numeric))

  // Display-Zelle (Klick öffnet Editor)
  const Disp = ({ id, field, children, empty }) => (
    <span className={`ct-edit${empty ? ' empty' : ''}`} onClick={open(id, field)} title="Klicken zum Bearbeiten">
      {children}
    </span>
  )

  return (
    <div>
      <div className="table-wrap">
        <table className="costs-table resp-table">
          <thead>
            <tr>
              <SortTh label="Empfänger" sortKey="recipient" sort={sort} onSort={(k) => onSort(k, false)} />
              <SortTh label="Betrag" sortKey="amount" sort={sort} onSort={(k) => onSort(k, true)} className="num" />
              <SortTh label="Zahlung" sortKey="rhythm" sort={sort} onSort={(k) => onSort(k, false)} />
              <SortTh label="Art" sortKey="kind" sort={sort} onSort={(k) => onSort(k, false)} />
              <SortTh label="Aufteilung" sortKey="split" sort={sort} onSort={(k) => onSort(k, false)} />
              <SortTh label="Konto" sortKey="accountId" sort={sort} onSort={(k) => onSort(k, false)} />
              <SortTh label="Kategorie" sortKey="category" sort={sort} onSort={(k) => onSort(k, false)} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} className={isOrderActive(o) ? '' : 'row-ended'}>
                {/* Empfänger */}
                <td data-label="Empfänger">
                  {isEd(o.id, 'recipient') ? (
                    <span ref={cellRef}><input autoFocus value={o.recipient} placeholder="Empfänger"
                      onChange={(e) => set(o.id, 'recipient', e.target.value)} /></span>
                  ) : (
                    <Disp id={o.id} field="recipient" empty={!o.recipient}>{o.recipient || 'Empfänger…'}</Disp>
                  )}
                </td>

                {/* Betrag */}
                <td className="num" data-label="Betrag">
                  {isEd(o.id, 'amount') ? (
                    <span ref={cellRef}><input autoFocus type="text" inputMode="decimal" value={o.amount}
                      placeholder="0,00" onChange={(e) => set(o.id, 'amount', e.target.value)} /></span>
                  ) : (
                    <Disp id={o.id} field="amount">
                      {formatEUR(parseAmountDE(o.amount))}
                      {o.rhythm !== 'monthly' && (
                        <small className="muted" style={{ marginLeft: 6 }}>= {formatEUR(monthly(o))}/M</small>
                      )}
                    </Disp>
                  )}
                </td>

                {/* Zahlung: Rhythmus, Fälligkeitsmonat und Ende in einer Zelle.
                    Vorher zwei Spalten, von denen die eine in jeder Zeile
                    „monatlich" und die andere in jeder Zeile „offen" sagte. */}
                <td data-label="Zahlung">
                  {isEd(o.id, 'rhythm') ? (
                    <span ref={cellRef}>
                      <div className="due-cell">
                        <select autoFocus value={o.rhythm}
                          onChange={(e) => { set(o.id, 'rhythm', e.target.value); if (e.target.value === 'monthly') setEdit(null) }}>
                          {RHYTHMS.map((r) => <option key={r} value={r}>{RHYTHM_LABELS[r]}</option>)}
                        </select>
                        {o.rhythm !== 'monthly' && (
                          <select value={o.dueMonth || ''} title="Monat der Fälligkeit"
                            onChange={(e) => { set(o.id, 'dueMonth', e.target.value); setEdit(null) }}>
                            <option value="">Monat?</option>
                            {MONTH_NAMES_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                          </select>
                        )}
                        <label className="ende-feld">
                          <span className="muted">läuft bis</span>
                          <input type="date" value={o.endDate || ''}
                            onChange={(e) => set(o.id, 'endDate', e.target.value)} />
                        </label>
                      </div>
                    </span>
                  ) : (
                    <Disp id={o.id} field="rhythm">
                      {RHYTHM_LABELS[o.rhythm]}
                      {o.rhythm !== 'monthly' && (
                        o.dueMonth
                          ? <small className="muted" style={{ marginLeft: 5 }}>· {MONTH_NAMES_SHORT[o.dueMonth - 1]}</small>
                          : <small className="muted" style={{ marginLeft: 5 }} title="Fälligkeitsmonat fehlt – klicken zum Setzen">· Monat?</small>
                      )}
                      {o.endDate && (isOrderActive(o)
                        ? <small className="muted" style={{ marginLeft: 6 }} title={`Noch ${monthsRemaining(o)} Monate`}>
                            · bis {formatDate(o.endDate)}
                          </small>
                        : <span className="pill ended" style={{ marginLeft: 6 }}>beendet</span>
                      )}
                    </Disp>
                  )}
                </td>

                {/* Art */}
                <td data-label="Art">
                  {isEd(o.id, 'kind') ? (
                    <span ref={cellRef}><select autoFocus value={o.kind}
                      onChange={(e) => { set(o.id, 'kind', e.target.value); setEdit(null) }}>
                      <option value="fixed">Fixkosten</option>
                      <option value="subscription">Abo</option>
                    </select></span>
                  ) : (
                    <span className="ct-edit" onClick={open(o.id, 'kind')} title="Klicken zum Bearbeiten">
                      <span className={`pill ${kindClass(o.kind)}`}>{KIND_LABEL[o.kind] || 'Fixkosten'}</span>
                    </span>
                  )}
                </td>

                {/* Aufteilung */}
                <td data-label="Aufteilung">
                  {isEd(o.id, 'split') ? (
                    <span ref={cellRef}>
                      <div className="split-cell">
                        <select value={o.splitMode} onChange={(e) => set(o.id, 'splitMode', e.target.value)}>
                          <option value="even">Gleich (alle)</option>
                          <option value="single">Eine Person</option>
                          <option value="percent">Prozent</option>
                          <option value="amount">Beträge €</option>
                        </select>
                        {o.splitMode === 'single' && (
                          <select value={o.splitPerson} onChange={(e) => set(o.id, 'splitPerson', e.target.value)}>
                            {persons.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        )}
                        {(o.splitMode === 'percent' || o.splitMode === 'amount') &&
                          persons.map((p) => (
                            <label key={p} className="split-share">
                              <span>{p}</span>
                              <input type="text" inputMode="decimal" value={o.splitShares?.[p] ?? ''}
                                onChange={(e) => setShare(o.id, p, e.target.value)} />
                              <span>{o.splitMode === 'percent' ? '%' : '€'}</span>
                            </label>
                          ))}
                      </div>
                    </span>
                  ) : (
                    <Disp id={o.id} field="split">
                      <span className="split-summary" title={splitText(o)}>{splitKurz(o)}</span>
                    </Disp>
                  )}
                </td>

                {/* Konto */}
                <td data-label="Konto">
                  {isEd(o.id, 'accountId') ? (
                    <span ref={cellRef}><select autoFocus value={o.accountId}
                      onChange={(e) => { set(o.id, 'accountId', e.target.value); setEdit(null) }}>
                      <option value="">– Konto wählen –</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select></span>
                  ) : (
                    <Disp id={o.id} field="accountId">
                      <span className="acct-dot" style={{ background: accColor(o.accountId) }} />
                      <span className="ellip" title={accName(o.accountId)}>{accName(o.accountId)}</span>
                    </Disp>
                  )}
                </td>

                {/* Kategorie (eigenes Chip-Menü) */}
                <td data-label="Kategorie">
                  <CategoryTag value={o.category} onChange={(cat) => set(o.id, 'category', cat)} />
                </td>

                {/* Löschen */}
                <td className="num" data-label="">
                  <button className="btn-del ct-del" onClick={() => del(o.id)} title="Löschen">✕</button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 22 }}>
                {orders.length === 0 ? 'Noch keine Posten – füge unten welche hinzu.' : 'Keine Treffer für diese Filter.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button className="btn add" onClick={() => add('fixed')}>+ Fixkosten</button>
      <button className="btn add" onClick={() => add('subscription')}>+ Abo</button>
    </div>
  )
}
