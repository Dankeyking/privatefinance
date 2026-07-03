import { useEffect, useRef, useState } from 'react'
import CategoryTag from './CategoryTag.jsx'
import { makeNewOrder, formToOrder, parseAmountDE } from '../lib/orderForm.js'
import { toMonthly, formatEUR, RHYTHM_LABELS } from '../lib/normalize.js'
import { personShareMonthly } from '../lib/recurring.js'
import { accountColor } from '../lib/accountColors.js'

const RHYTHMS = ['monthly', 'quarterly', 'yearly']
const KIND_LABEL = { fixed: 'Fixkosten', subscription: 'Abo', savings: 'Sparen' }
const kindClass = (k) => (k === 'savings' ? 'sav' : k === 'subscription' ? 'sub' : 'fix')

// Click-to-Edit-Tabelle: schöne, formatierte Ansicht; Klick auf eine Zelle
// macht genau dieses Feld editierbar. Voll kontrolliert (orders/onChange).
export default function CostsTable({ accounts, persons, orders, onChange, filter = () => true }) {
  const visible = orders.filter(filter)
  const [edit, setEdit] = useState(null) // { id, field }
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
  const splitText = (o) => {
    const cost = formToOrder(o, persons)
    const parts = persons
      .map((p) => ({ p, m: personShareMonthly(cost, p, persons) }))
      .filter((x) => x.m > 0.005)
      .map((x) => `${x.p} ${formatEUR(x.m)}`)
    return parts.join(' · ') || '—'
  }

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
              <th>Empfänger</th><th className="num">Betrag</th><th>Rhythmus</th>
              <th>Art</th><th>Aufteilung / Monat</th>
              <th>Konto</th><th>Kategorie</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id}>
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

                {/* Rhythmus */}
                <td data-label="Rhythmus">
                  {isEd(o.id, 'rhythm') ? (
                    <span ref={cellRef}><select autoFocus value={o.rhythm}
                      onChange={(e) => { set(o.id, 'rhythm', e.target.value); setEdit(null) }}>
                      {RHYTHMS.map((r) => <option key={r} value={r}>{RHYTHM_LABELS[r]}</option>)}
                    </select></span>
                  ) : (
                    <Disp id={o.id} field="rhythm">{RHYTHM_LABELS[o.rhythm]}</Disp>
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
                      <span className="split-summary">{splitText(o)}</span>
                    </Disp>
                  )}
                </td>

                {/* Konto */}
                <td data-label="Konto">
                  {isEd(o.id, 'accountId') ? (
                    <span ref={cellRef}><select autoFocus value={o.accountId}
                      onChange={(e) => { set(o.id, 'accountId', e.target.value); setEdit(null) }}>
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
